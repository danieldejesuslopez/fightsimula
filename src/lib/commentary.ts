/**
 * AI Commentator — UFC-style dual commentary (play-by-play + color)
 */

const heavyStrikeLines = [
  [
    "Joe: OH! What a shot! That landed flush!",
    "DC: He put everything into that one, Joe. You can see the legs wobble.",
  ],
  [
    "Joe: MASSIVE strike lands! The whole arena felt that!",
    "DC: That's the kind of power that changes fights. He needs to capitalize right now.",
  ],
  [
    "Joe: He CRACKED him! That was a bomb!",
    "DC: Look at the snap on that punch. Elite-level power right there.",
  ],
  [
    "Joe: That was VICIOUS! Right on the chin!",
    "DC: When you land that clean with that kind of torque, it doesn't matter how tough you are.",
  ],
  [
    "Joe: He's HURT! That was a devastating strike!",
    "DC: He loaded up on that one and it found the mark perfectly.",
  ],
];

const cleanStrikeLines = [
  [
    "Joe: Nice clean shot lands there.",
    "DC: Beautiful technique. Textbook striking.",
  ],
  [
    "Joe: Sharp jab finds the target.",
    "DC: He's picking his shots intelligently, staying behind that jab.",
  ],
  [
    "Joe: Good combination landing for him.",
    "DC: The footwork sets that up. He's creating angles and making it count.",
  ],
  [
    "Joe: Stiff shot lands right down the pipe.",
    "DC: That's range management at its finest. He knows exactly where he needs to be.",
  ],
  [
    "Joe: Clean connection, you can hear that one.",
    "DC: He's timing the entries perfectly. High-level striking on display.",
  ],
];

const takedownLines = [
  [
    "Joe: TAKEDOWN! He puts him on the mat!",
    "DC: Beautiful level change. He shot in deep and finished it. That's championship wrestling.",
  ],
  [
    "Joe: He drags him down! Now he's on top!",
    "DC: He made it look easy, but that's years of wrestling right there.",
  ],
  [
    "Joe: Big takedown secured!",
    "DC: When you can put a man on his back like that, it changes the whole dynamic of the fight.",
  ],
  [
    "Joe: He gets the takedown and lands in a dominant position!",
    "DC: The chain wrestling is phenomenal. One attempt flows right into the next.",
  ],
];

const clinchLines = [
  [
    "Joe: They're locked up in the clinch, battling for position.",
    "DC: Neither man willing to give an inch. This is a real dog fight in there.",
  ],
  [
    "Joe: Clinch battle against the cage.",
    "DC: Dirty boxing territory now. Let's see who can create separation.",
  ],
  [
    "Joe: They're tied up, jockeying for position.",
    "DC: This is where experience matters. The veteran knows how to work from here.",
  ],
];

const roundStartLines = [
  [
    "Joe: Round {round} is underway!",
    "DC: Let's see if they make any adjustments.",
  ],
  [
    "Joe: Here we go, round {round}!",
    "DC: Both corners had a lot to say. Let's see who listened.",
  ],
  [
    "Joe: Round {round} begins! Touch gloves and let's fight!",
    "DC: The energy in here is electric. This is what it's all about.",
  ],
  [
    "Joe: And we're back for round {round}!",
    "DC: This is where cardio and heart start to separate the contenders from the pretenders.",
  ],
];

const roundEndLines = [
  [
    "Joe: And that's the end of round {round}!",
    "DC: Great round of action. I think we're going to see some interesting scorecards.",
  ],
  [
    "Joe: The horn sounds to end round {round}!",
    "DC: Both fighters gave everything in that round. Championship-level stuff.",
  ],
  [
    "Joe: Time! Round {round} is in the books!",
    "DC: The corners are going to have their work cut out for them between rounds.",
  ],
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function templateReplace(lines: string[], round: number, fighterA: string, fighterB: string): string[] {
  return lines.map(l =>
    l.replace(/\{round\}/g, String(round))
      .replace(/\{fighterA\}/g, fighterA)
      .replace(/\{fighterB\}/g, fighterB)
  );
}

export function generateCommentary(
  event: string,
  fighterA: string,
  fighterB: string,
  round: number
): string[] {
  const lower = event.toLowerCase();

  if (lower.includes("lands a heavy")) {
    return templateReplace(pickRandom(heavyStrikeLines), round, fighterA, fighterB);
  }

  if (lower.includes("lands a clean")) {
    return templateReplace(pickRandom(cleanStrikeLines), round, fighterA, fighterB);
  }

  if (lower.includes("secures a takedown")) {
    return templateReplace(pickRandom(takedownLines), round, fighterA, fighterB);
  }

  if (lower.includes("clinch")) {
    return templateReplace(pickRandom(clinchLines), round, fighterA, fighterB);
  }

  // Generic fallback
  return [`Joe: ${event}`];
}

export function generateRoundStartCommentary(round: number, fighterA: string, fighterB: string): string[] {
  return templateReplace(pickRandom(roundStartLines), round, fighterA, fighterB);
}

export function generateRoundEndCommentary(round: number, fighterA: string, fighterB: string): string[] {
  return templateReplace(pickRandom(roundEndLines), round, fighterA, fighterB);
}
