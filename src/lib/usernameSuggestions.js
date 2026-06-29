const ADJECTIVES = [
  'Mighty', 'Sneaky', 'Golden', 'Fearless', 'Clutch', 'Rowdy', 'Electric',
  'Cosmic', 'Blazing', 'Silent', 'Ruthless', 'Lucky', 'Wobbly', 'Majestic',
  'Chaotic', 'Feral', 'Turbo', 'Phantom', 'Reckless', 'Glorious',
]

const NOUNS = [
  'Striker', 'Keeper', 'Maverick', 'Falcon', 'Panther', 'Wizard', 'Nomad',
  'Rocket', 'Phantom', 'Gladiator', 'Tornado', 'Comet', 'Outlaw', 'Specter',
  'Voyager', 'Dynamo', 'Hammer', 'Bandit', 'Cyclone', 'Legend',
]

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function suggestUsernames(count = 4) {
  const suggestions = new Set()
  while (suggestions.size < count) {
    const name = `${randomItem(ADJECTIVES)}${randomItem(NOUNS)}${Math.floor(Math.random() * 100)}`
    suggestions.add(name)
  }
  return Array.from(suggestions)
}
