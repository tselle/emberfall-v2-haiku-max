# Emberfall: The Emberwild Saga

An unofficial, non-commercial fan project. Emberfall is a party-based fantasy role-playing game in the style of late-1980s "gold box" computer RPGs: walk a town or dungeon in first person, cross the wilderness on a painted regional map, and resolve encounters on a tactical isometric board. It uses second-edition-style THAC0, descending armour class, memorised spells and class-specific advancement. It is not an endorsed tabletop or licensed computer-game product.

## Play

Open `index.html` in a recent browser. That is all. There is nothing to install, no build step, no server and no network connection. For LAN play from a folder of these files:

```sh
python3 -m http.server 8000
```

Then visit `http://<host>:8000/` from another device. It is written for recent Chrome, Edge, Firefox and Safari, including iPadOS and iOS Safari 16 or later. So far it has been exercised only in headless Chrome on desktop-sized and phone-sized screens.

## The game

1. **Choose an Adventure.** The chooser holds the four named saga adventures and fifty generated ones in five bands of ten.
2. **Assemble your company.** Six pregenerated heroes are waiting, or create your own. Up to six members march. The first three able members stand in front.
3. **Work in town.** The hall offers commissions and takes reports. The inn rests the company and restores its spells. The temple cures and raises the dead. The training yard advances those ready to level. Shops sell arms, armour, potions and gear.
4. **Explore.** Walk the dungeon in first person. Bump into bands to challenge them, search for secrets and traps, pick locks, open chests, and camp to rest.
5. **Travel the wilds.** Cross the painted region one mile at a time. Each mile costs time; weary companies slow down after ten hours of marching. Sites offer shrines, healers, hamlets and lairs.
6. **Fight.** Battles play on an isometric board. Move, attack, cast, turn undead, hide, use items, or let the AI fight with Auto-Battle.
7. **Return and advance.** Report completed commissions, rest, train, and carry the company on to the next adventure.

### Controls

| Context | Keys |
| --- | --- |
| Walking | W or Up forward; S or Down back; A or Left and D or Right turn; Q and E sidestep; F search; R camp |
| Wilds | W, A, S, D or arrows move on the compass; Q, E, Z, C diagonal; Enter or Space visits a site; R camp |
| Anywhere | P party drawer; 1 to 6 open a sheet; M survey map; J journal; B bestiary; Esc menu; H help |
| Battle | Click or arrows to move and attack; C cast; T turn undead; H hide; U use item; Space or Enter end turn; Q Auto-Battle; Esc cancels a target |

Touch play has on-screen pads. Tap the pad toggle to cycle off, right, left and both.

### Saves

Saves live only in this browser, under `localStorage` keys `emberfall.save.auto`, `.1`, `.2` and `.3`. There are three manual slots, and an autosave that is written at each checkpoint. Continue loads the newest save. Saves are not files you download, and nothing is sent anywhere.

## The content

- **Saga:** *The Cellars of Thornwick* (E0), *The Hollow Vaults* (E1), *The Barrow of the Iron King* (E2) and *The Witch-Queen of Ravenmoor* (E3), in that order.
- **Generated adventures:** fifty deterministic modules (levels 1 to 20). The same seeds always produce the same doors, bosses, items and quests.
- **Rules:** six races, six classes, nine alignments, group saving throws, spell lists for mages and priests, and the paladin's restricted list.

## Files

```
index.html           the page and the script order
css/style.css        layout and theme
js/rules.js          dice, races, classes, THAC0, saves, spells, XP, character derivation
js/data.js           items, spells, saga creatures, shops, commissions, pregens, Hollow Vaults maps
js/modules.js        saga module records and the authored Thornwick, Coldharrow and Ravenmoor maps
js/monsters.js       the wider creature catalogue and generated leaders
js/wilds.js          the Thornwick Vale region
js/treasure.js       enchanted items and seeded treasure
js/adventures.js     the fifty generated adventures and the saga wildernesses
js/figures.js        procedural figures (sheets, cards, billboards, battle sprites)
js/view3d.js         the first-person raycaster
js/ui.js             screens, dialogs, command bar, sheets, shops, creator, saves
js/combat.js         the tactical battle
js/overland.js       wilderness travel, encounters and sites
js/campaign.js       town services, levelling, starting kits, campaign travel
js/journal.js        commissions and notes
js/map.js            minimap and survey map
js/bestiary.js       the bestiary
js/navpad.js         touch pads
js/watch.js          sightings, noticing, ambush and surprise
js/game.js           the state, movement, events, traps, saves, input
LICENSE              MIT
```

Scripts are classic, ordered `<script>` tags with relative paths. No ES modules, bundler, framework, CDN, fonts or images are used. Every picture is drawn in code, and no sound is used.

## Notes

The copyright notice is carried over from the reference project. The content is written for this release; the generated adventures and the saga wildernesses are reproducible from fixed seeds.
