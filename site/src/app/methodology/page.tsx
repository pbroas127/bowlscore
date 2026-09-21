import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { GRADE_COLOR, NOT_VET_LONG, SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'How we score pet food',
  description: 'The full BowlScore method: ingredients 50 points, nutrition on a dry matter basis 30, additives 20, hard caps, cat specific rules and every source we rely on.',
  alternates: { canonical: '/methodology' },
}

export default function Methodology() {
  return (
    <LegalPage title="How we score">
      <p className="!mt-4 text-ink2">Scoring model v1, updated September 2026</p>
      <p>
        A BowlScore is a number from 0 to 100 that describes the ingredient quality of a dog or cat food, based only on what is printed on the label. The photo is read by an AI vision model, but the model only transcribes. Every point is decided by a fixed, public rubric, so the same label always gets the same score.
      </p>

      <h2>The three parts of a score</h2>
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th>Points</th>
            <th>What it looks at</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ingredients</td>
            <td>50</td>
            <td>What the food is mostly made of, and whether the animal sources are named</td>
          </tr>
          <tr>
            <td>Nutrition</td>
            <td>30</td>
            <td>Protein, fat and estimated carbohydrate on a dry matter basis, against AAFCO minimums</td>
          </tr>
          <tr>
            <td>Additives</td>
            <td>20</td>
            <td>Dyes, synthetic preservatives, sweeteners and ingredients that are unsafe for the species</td>
          </tr>
        </tbody>
      </table>

      <h3>Ingredients, 50 points</h3>
      <p>Ingredients are listed by weight, so the first five make up most of the food. Every food starts at 12 points and moves from there.</p>
      <ul>
        <li>First ingredient: a named fresh meat such as chicken or salmon adds 15. A named meal such as chicken meal adds 13. A named byproduct adds 8. An unnamed source such as meat and bone meal adds 4. No animal protein in first place adds 3 for dogs and nothing for cats.</li>
        <li>In wet foods, water or broth is skipped when we look for the first ingredient, because it is there for processing.</li>
        <li>Each named meat or named meal in the first five adds 5, up to three of them.</li>
        <li>Plant protein boosters in the first five, such as corn gluten meal or pea protein, cost 4 each for dogs and 6 each for cats. They raise the protein number on the label without adding meat.</li>
        <li>Fillers in the first five, such as corn, wheat, soy or cellulose, cost 3 each for dogs and 5 each for cats.</li>
        <li>Ingredient splitting costs 4. That is when three or more pea or legume ingredients appear in the first ten, which can push meat higher on the list than it deserves. For dogs, two legumes cost 2 and come with a note about the FDA investigation into diet and heart disease.</li>
        <li>Unnamed animal ingredients anywhere on the label, such as animal fat or animal digest, cost 3 each, up to three of them.</li>
        <li>Small bonuses: organ meat adds 3, a named omega oil such as salmon oil adds 3, and a named animal fat such as chicken fat adds 2.</li>
      </ul>

      <h3>Nutrition, 30 points</h3>
      <p>Nutrition is judged only for foods that carry a complete and balanced statement, and only after the water is removed (see the dry matter math below).</p>
      <ul>
        <li>Protein, up to 14 points. Meeting the AAFCO minimum earns 6, and the rest scales up to an ideal of 30 percent for dogs and 45 percent for cats. The minimums are 18 percent for adult dogs, 22.5 for puppies, 26 for adult cats and 30 for kittens.</li>
        <li>Fat, up to 8 points. Full marks inside the healthy band, which is 12 to 22 percent for dogs and 15 to 28 percent for cats. Fat below the AAFCO minimum earns nothing and is flagged.</li>
        <li>Estimated carbohydrate, up to 8 points. Labels do not print carbs, so we estimate them as whatever is left after protein, fat, fiber and ash. For dogs, 30 percent or less earns full marks and the points step down at 45 and 55. For cats the steps are 15, 25 and 35, because cats have very little need for carbs.</li>
      </ul>
      <p>If we cannot read a guaranteed analysis, the food is scored on ingredients and additives only, and those 70 points are rescaled to 100. The result screen says so. Treats, toppers and foods labeled for supplemental feeding are scored the same way.</p>

      <h3>Additives, 20 points</h3>
      <p>Every food starts with all 20 points and loses them for things that do not need to be there.</p>
      <ul>
        <li>Artificial colors such as Red 40, Yellow 5, Blue 2 or titanium dioxide: 4 each, up to 8.</li>
        <li>Synthetic preservatives BHA, BHT, ethoxyquin and TBHQ: 5 each, up to 10.</li>
        <li>Propylene glycol: 5. Added sugar or syrup: 3. Carrageenan: 2. Menadione: 2.</li>
        <li>Garlic: 4. Onion: 8. Xylitol: 10.</li>
      </ul>
      <p>Foods preserved with mixed tocopherols (vitamin E) or rosemary extract get a positive note.</p>

      <h2>Hard caps</h2>
      <p>Some findings limit the final score no matter how good the rest of the recipe is.</p>
      <table>
        <thead>
          <tr>
            <th>Finding</th>
            <th>Dogs</th>
            <th>Cats</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Xylitol</td>
            <td>Capped at 5</td>
            <td>Capped at 20</td>
          </tr>
          <tr>
            <td>Onion in any form</td>
            <td>Capped at 30</td>
            <td>Capped at 25</td>
          </tr>
          <tr>
            <td>Garlic</td>
            <td>Penalty only</td>
            <td>Capped at 35</td>
          </tr>
          <tr>
            <td>Propylene glycol</td>
            <td>Penalty only</td>
            <td>Capped at 15</td>
          </tr>
          <tr>
            <td>Protein below the AAFCO minimum</td>
            <td>Capped at 45</td>
            <td>Capped at 45</td>
          </tr>
        </tbody>
      </table>

      <h2>Rules that apply only to cats</h2>
      <ul>
        <li>Taurine. Cats cannot make enough taurine on their own and need it for heart and eye health. A complete cat food with no taurine on the label gets a critical flag and loses 8 points.</li>
        <li>Higher protein. Cats are obligate carnivores, so the protein minimum is 26 percent on a dry matter basis (30 for kittens) and full marks need 45 percent. Plant proteins, fillers and carbs all cost more than they do for dogs.</li>
        <li>Propylene glycol. The FDA prohibits it in cat food under 21 CFR 589.1001 because it damages feline red blood cells. It caps a cat food at 15.</li>
        <li>Garlic. Cats are especially sensitive to the onion family, so garlic caps a cat food at 35.</li>
      </ul>

      <h2>Dry matter math</h2>
      <p>
        The guaranteed analysis on a label is printed as fed, water included. A can of wet food is mostly water, so its protein number looks tiny next to kibble. AAFCO minimums are set on a dry matter basis, so we remove the water before judging anything.
      </p>
      <p>
        <strong>Dry matter percent = as fed percent, divided by (100 minus moisture percent), times 100.</strong>
      </p>
      <p>A worked example with a wet cat food that prints 10 percent protein, 5 percent fat and 78 percent moisture:</p>
      <ul>
        <li>The solids are 100 minus 78, which is 22 percent of the can.</li>
        <li>Protein is 10 divided by 22, times 100, which is 45.5 percent on a dry matter basis.</li>
        <li>Fat is 5 divided by 22, times 100, which is 22.7 percent.</li>
      </ul>
      <p>A kibble that prints 26 percent protein and 10 percent moisture works out to 26 divided by 90, or 28.9 percent. The wet food that looked weak on the label is the higher protein food. When a label does not print moisture, we assume 10 percent for dry food, 78 for wet, 70 for raw, 30 for soft moist food and 5 for freeze dried.</p>

      <h2>Grade bands</h2>
      <table>
        <thead>
          <tr>
            <th>Score</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['75 to 100', 'Excellent'],
              ['50 to 74', 'Good'],
              ['25 to 49', 'Poor'],
              ['0 to 24', 'Bad'],
            ] as const
          ).map(([range, grade]) => (
            <tr key={grade}>
              <td>{range}</td>
              <td>
                <span className="mr-2 inline-block size-3 rounded-full align-middle" style={{ background: GRADE_COLOR[grade] }} />
                {grade}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>What a score does not measure</h2>
      <ul>
        <li>We do not test food in a lab. We cannot see contamination, heavy metals or whether the bag matches its label.</li>
        <li>We do not audit sourcing, manufacturing or digestibility.</li>
        <li>We do not know your pet. Allergies, kidney disease, weight and age all change what the right food is.</li>
        <li>Label photos are read by software, and software makes mistakes. Glare, curved cans and tiny print can cause a misread. Always check the ingredient list the app shows against the bag.</li>
      </ul>
      <p>{NOT_VET_LONG}</p>

      <h2>Sources</h2>
      <ul>
        <li>
          <a href="https://www.aafco.org/consumers/understanding-pet-food/">AAFCO</a>: Dog and Cat Food Nutrient Profiles for the dry matter minimums, plus the official ingredient definitions and labeling rules.
        </li>
        <li>
          <a href="https://www.ecfr.gov/current/title-21/section-589.1001">FDA, 21 CFR 589.1001</a>: propylene glycol is prohibited in cat food.
        </li>
        <li>
          <a href="https://www.fda.gov/animal-veterinary/outbreaks-and-advisories/fda-investigation-potential-link-between-certain-diets-and-canine-dilated-cardiomyopathy">FDA Center for Veterinary Medicine</a>: the investigation into legume heavy diets and canine dilated cardiomyopathy.
        </li>
        <li>
          <a href="https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals">Merck Veterinary Manual</a>: taurine requirements in cats, and onion, garlic and xylitol toxicity.
        </li>
        <li>
          <a href="https://wsava.org/global-guidelines/global-nutrition-guidelines/">WSAVA Global Nutrition Guidelines</a>: how veterinarians assess a diet and a manufacturer.
        </li>
      </ul>

      <h2>Independence</h2>
      <p>Brands cannot pay for a score. We do not run ads, we do not accept sponsored placements, and scores are calculated the same way for every food. BowlScore earns money from subscriptions, and from affiliate commissions when you buy a suggested food through our link. Commissions never change a score or the order of the suggestions.</p>

      <h2>Versions and corrections</h2>
      <p>This page describes Scoring model v1. Whenever a number in the rubric changes, the version number changes and the change is listed here.</p>
      <ul>
        <li>v1, September 2026: first public version.</li>
      </ul>
      <p>
        Think a score is wrong? Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Score%20correction`}>{SUPPORT_EMAIL}</a> with the product name and a photo of the label. Every report gets read.
      </p>
    </LegalPage>
  )
}
