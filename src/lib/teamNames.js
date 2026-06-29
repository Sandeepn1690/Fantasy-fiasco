// Shorter labels for teams whose full name wraps awkwardly inside a
// fixed-width pick button. Only used in tight spaces — the full official
// name is still shown in the fixture header where there's more room.
const SHORT_NAMES = {
  'Democratic Republic of the Congo': 'DR Congo',
  'Bosnia and Herzegovina': 'Bosnia',
}

export function shortNameFor(teamName) {
  return SHORT_NAMES[teamName] ?? teamName
}
