// Wraps app.json. BowlScore only schedules LOCAL notifications (the trial reminder), but expo-notifications always
// adds the remote push entitlement, which the App ID does not have, so signing fails. A mod registered here is
// registered before the plugins in app.json and therefore runs after them, which lets it remove the entitlement.
// If remote push is ever needed: enable Push Notifications on the App ID, delete this file, rebuild with MATCH_FORCE.
const { withEntitlementsPlist } = require('expo/config-plugins')

module.exports = ({ config }) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment']
    return c
  })
