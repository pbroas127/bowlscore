# Building an iOS app to TestFlight from Windows

How the Wick app (repo `pbroas127/phos`, at `C:\Users\pbroa\AI Projects\Phos`) gets from a Windows PC onto
TestFlight, written up so BowlScore can reuse it.

There is no Mac involved. Everything that needs macOS happens on a GitHub Actions runner.

**Credentials are deliberately not in this file.** The App Store Connect key id, issuer id, team id, and the
path to the `.p8` private key all live together at the top of `C:\Users\pbroa\AI Projects\Phos\.secrets\asc.py`,
in a folder that is gitignored. Read them there. Do not copy them into this repo, which may end up public.

---

## 1. The pipeline

| Piece | Path |
| --- | --- |
| Workflow | `C:\Users\pbroa\AI Projects\Phos\.github\workflows\beta.yml` |
| Fastfile | `C:\Users\pbroa\AI Projects\Phos\fastlane\Fastfile` |
| Matchfile | `C:\Users\pbroa\AI Projects\Phos\fastlane\Matchfile` |
| Credentials, gitignored | `C:\Users\pbroa\AI Projects\Phos\.secrets\` |

The repo is **private**. It was public until 2026-09-18 and was made private after an App Review problem, see
part 5.

### The workflow

- `on: workflow_dispatch` only, never on push. Builds are deliberate.
- `concurrency: group: beta, cancel-in-progress: false`, so two runs cannot race for the same build number.
- `runs-on: macos-15`, `timeout-minutes: 60`.
- An input called `regenerate_profiles` sets `MATCH_FORCE=1` for the run. See the capability gotcha below.

Steps in order:

1. `actions/checkout@v4`
2. Select the newest Xcode 26: `XCODE=$(ls -d /Applications/Xcode_26*.app | sort -V | tail -1)` then
   `sudo xcode-select -s "$XCODE"`. Pinning by wildcard survives runner image updates.
3. `webfactory/ssh-agent@v0.9.1` loading the match deploy key, then
   `ssh-keyscan -H github.com >> ~/.ssh/known_hosts`.
4. `brew install xcodegen` and `xcodegen generate`. **Wick specific**, see the Expo notes.
5. `which fastlane || brew install fastlane`
6. `fastlane beta`, with the secrets passed through `env:`.
7. Two `if: always()` verification steps that unzip the built IPA and print what was actually signed.

### The lane

```ruby
lane :beta do
  setup_ci                                   # required on CI, makes a temporary keychain

  api_key = app_store_connect_api_key(
    key_id: ENV.fetch("ASC_KEY_ID"),
    issuer_id: ENV.fetch("ASC_ISSUER_ID"),
    key_content: ENV.fetch("ASC_KEY_P8")
  )

  match(
    type: "appstore",
    api_key: api_key,
    app_identifier: IDS,                     # array, one entry per bundle id
    readonly: false,                         # first run must be able to create profiles
    force: ENV["MATCH_FORCE"] == "1",
    force_for_new_devices: false
  )

  build_number = latest_testflight_build_number(
    api_key: api_key,
    app_identifier: IDS.first,
    initial_build_number: 0
  ) + 1

  gym(
    project: "Phos.xcodeproj",
    scheme: "Phos",
    export_method: "app-store",
    xcargs: "CURRENT_PROJECT_VERSION=#{build_number}",
    export_options: {
      provisioningProfiles: IDS.to_h { |id| [id, "match AppStore #{id}"] }
    }
  )

  pilot(
    api_key: api_key,
    skip_waiting_for_build_processing: true,
    distribute_external: false
  )
end
```

`IDS` is a frozen array of the six bundle ids: the app plus five extensions. A plain React Native app needs
only one entry.

### Adapting it for Expo

The XcodeGen steps do not apply. Replace step 4 with:

1. `actions/setup-node` with the project's Node version
2. `npm ci`
3. `npx expo prebuild --platform ios --clean`
4. `cd ios && pod install`

Then in the lane, swap the gym target:

```ruby
gym(
  workspace: "ios/BowlScore.xcworkspace",
  scheme: "BowlScore",
  ...
)
```

Everything from `setup_ci` through `pilot` transfers unchanged. Alternatively use EAS Build, which handles
prebuild and signing itself, at the cost of being Expo's paid cloud service.

---

## 2. Secrets and signing

Five repository secrets, named exactly as the workflow's `env:` block reads them:

| Secret name | What goes in it |
| --- | --- |
| `ASC_KEY_ID` | App Store Connect API key id |
| `ASC_ISSUER_ID` | Issuer id for that key |
| `ASC_KEY_P8` | The entire contents of the `.p8` file, pasted in, including the BEGIN and END lines |
| `MATCH_PASSWORD` | Passphrase that encrypts the match repo |
| `MATCH_DEPLOY_KEY` | SSH private key with write access to the match certificates repo |

Set them with `gh secret set NAME --repo pbroas127/bowlscore` so the values never sit in shell history.

The same App Store Connect API key can serve several apps on the account. There is no need to mint a new one
for BowlScore, though a separate key is tidier if you ever want to revoke one app's access alone.

**Signing is fastlane match.** Certificates and profiles live encrypted in a separate private git repo, reached
over SSH via the deploy key. Notes:

- The first build for a new bundle id needs `readonly: false`, or match cannot create the profile.
- `setup_ci` is not optional. Without it, match tries to use the login keychain and the run hangs or fails.
- The `provisioningProfiles` map in `export_options` must name profiles as `match AppStore <bundle id>`, which
  is the naming convention match uses.

---

## 3. Gotchas

**Build numbers.** Never commit one. Ask TestFlight what the last build was and add one, then inject it at
build time through `xcargs: "CURRENT_PROJECT_VERSION=..."`. This is the reason for the concurrency group: two
overlapping runs would both compute the same number and the second upload would be rejected.

**Export compliance.** Without a declaration, every upload sits in TestFlight waiting on a manual question.
Put `ITSAppUsesNonExemptEncryption: false` in the Info.plist. For Expo, set
`ios.config.usesNonExemptEncryption: false` in `app.json`.

**Framework minimum OS version.** A prebuilt framework that declares a higher `MinimumOSVersion` than the app's
deployment target gets the upload rejected with `ITMS-90208`. Fix is a post build script that rewrites the
framework's Info.plist with PlistBuddy and then re-signs the framework with `codesign`. React Native ships
plenty of xcframeworks, so expect to meet this.

**Capability changes invalidate cached profiles.** After turning on a capability in the developer portal, the
profile match has stored is stale and signing fails in confusing ways. That is what the `regenerate_profiles`
workflow input is for: it sets `MATCH_FORCE=1` for one run, match rebuilds the profiles, then you go back to
normal runs.

**Extension placement.** App extensions must be embedded in `MyApp.app/PlugIns/`. ExtensionKit extensions,
which are a different thing, must be in `MyApp.app/Extensions/`. One in the wrong place causes an App Review
rejection that reads as though an entitlement is missing. The workflow has a verification step that unzips the
IPA, fails the build if any `.appex` sits at the top level of the app bundle, and prints the signed
entitlements and the profile entitlements of every binary. Probably irrelevant to a plain Expo app, but the
pattern of verifying the artifact instead of trusting the build is worth copying.

**TestFlight internal groups only accept team members.** You cannot type a stranger's email into an internal
group. The flow is: invite them in Users and Access with a limited role and only that app visible, they accept
Apple's invite and set up an Apple Account with that address, and only then can you add them to the group.
TestFlight then emails them the invitation. Internal testing needs no Beta App Review, which is why builds are
testable minutes after upload. External groups skip the team membership requirement but require Beta App
Review for each build.

**Runner cost.** macOS runners bill at 10x the minute multiplier on private repos. A Wick build is about eight
minutes, so roughly eighty minutes of quota per upload. Do not leave a build loop running overnight.

**Two useful pilot options.** `skip_waiting_for_build_processing: true` ends the job at upload instead of
idling ten minutes on a paid runner. `distribute_external: false` keeps the build internal.

---

## 4. In app purchases

Nothing to hand over. Wick is free with no purchases, so this pipeline has never signed, uploaded, or tested an
app with StoreKit in it. Anything about sandbox testers, StoreKit configuration files, or receipt validation
would be general knowledge rather than something proven here. Treat it as unverified and test it properly.

---

## 5. Two account rules that override everything above

**Do not submit to App Review through the App Store Connect API.** On 2026-09-20 Apple locked Peter's developer
account following a run of API driven submissions and resubmissions for Wick. Those appear in App Store Connect
as coming from an API user rather than a person. The account was restored, and the standing rule now is that
submit, resubmit, and expedite happen in the App Store Connect web pages under Peter's own name. Uploading
builds to TestFlight with fastlane `pilot` is fine, because that is not App Review.

**Wick was rejected under Guideline 4.3(a), spam.** App Review said the app "duplicates the content and
functionality of other apps submitted to the App Store" and, as a matter of policy, would not say which apps.
They also attached an Extended Review warning, which states that repeated submissions of this kind lead to
longer review times and can end in removal from the Apple Developer Program.

What that means for BowlScore, since it shares an account:

- Give it a genuinely separate identity. Its own icon, its own color and type choices, its own store copy and
  screenshots. Do not copy theme files, component styles, or art from Wick or the 75 Hard app.
- A brand new app appearing overnight on the same account, from the same pipeline, is the exact pattern that
  drew the spam flag. Shipping it to TestFlight is low risk. Submitting it for review while Wick's rejection is
  unresolved is not.
- Let Peter decide when anything goes to App Review, and let him press the button.
