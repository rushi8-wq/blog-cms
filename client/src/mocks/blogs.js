const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

export const initialBlogs = [
  {
    _id: "sample-1",
    title: "The quiet joy of learning something slowly",
    content:
      "We live in a world that rewards speed: quick answers, quick wins, and quick opinions. But some of the most meaningful things in life resist being rushed. Learning to bake bread, play an instrument, or understand a difficult idea asks us to show up repeatedly, even when progress is hard to see.\n\nThat slow practice changes how we pay attention. We begin to notice the small improvements: a dough that rises more evenly, a chord that rings clearly, or a paragraph that finally makes sense. These moments remind us that mastery is less a finish line than a relationship with the work.\n\nIf there is something you have been meaning to learn, consider giving it a little time each week. You do not need a perfect plan. You only need to begin, stay curious, and let the process surprise you.",
    author: "Maya Chen",
    tags: ["creativity", "learning", "life"],
    likes: ["reader-a", "reader-b", "reader-c"],
    likesCount: 3,
    comments: [
      {
        _id: "comment-1",
        blogId: "sample-1",
        name: "Jordan Lee",
        text: "A lovely reminder to enjoy the process instead of racing to the result.",
        createdAt: daysAgo(1),
      },
    ],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    _id: "sample-2",
    title: "A small guide to a more thoughtful morning",
    content:
      "A calm morning does not require a complicated routine or a 5 a.m. alarm. It can start with one small decision: leave your phone where it is for the first ten minutes after waking.\n\nUse that time to open a window, make something warm to drink, or write down the one thing you hope to give your attention to today. The point is not to optimize every minute. It is to make a little room between waking up and reacting to the world.\n\nTry a version that feels kind rather than strict. A routine should support your life, not become another standard you have to meet.",
    author: "Amir Patel",
    tags: ["wellbeing", "habits"],
    likes: ["reader-a", "reader-d"],
    likesCount: 2,
    comments: [],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    _id: "sample-3",
    title: "What community gardens teach us about cities",
    content:
      "A community garden is a little city in its own right. Neighbors share tools, trade advice, and discover that the soil in one corner behaves differently from the soil in another. The work is practical, but the lessons are social.\n\nThese spaces show what can happen when people have somewhere to contribute. A single raised bed can become a meeting place, a classroom, and a reason to look out for one another. The harvest matters, but so does the habit of tending something together.\n\nAs our cities grow, small shared spaces deserve more attention. They help make a neighborhood feel like a place people shape, not just a place they pass through.",
    author: "Elena Brooks",
    tags: ["community", "urban-life", "nature"],
    likes: ["reader-b", "reader-c", "reader-e", "reader-f"],
    likesCount: 4,
    comments: [],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    _id: "sample-4",
    title: "Making the most of a notebook",
    content:
      "A notebook can be a place for unfinished thoughts. It does not need to be beautiful, and it does not need to prove that you are productive. Its best pages might be messy lists, questions you are still thinking about, or a sketch that makes no sense to anyone else.\n\nTry using a notebook as a low-pressure landing spot for ideas. Date the page, write what is on your mind, and keep going without editing. When you return later, you may find a connection you could not see in the moment.\n\nThe habit is simple: give your thoughts somewhere to go before asking them to become anything more.",
    author: "Noah Williams",
    tags: ["writing", "creativity"],
    likes: ["reader-d"],
    likesCount: 1,
    comments: [],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    _id: "sample-5",
    title: "The case for taking the scenic route",
    content:
      "We often choose the most direct route because it saves time. But there are days when the longer way home offers something useful: a street we have never noticed, a corner shop with its door open, or a few quiet minutes to let a busy day settle.\n\nTaking the scenic route is not always practical, and that is precisely why it can feel like a gift. It invites us to trade a little efficiency for a bit of presence. The destination stays the same; our attention does not.\n\nNext time you have a few spare minutes, take a different turn. You might find that the best part of getting there was the route you did not plan.",
    author: "Sofia Rivera",
    tags: ["travel", "mindfulness", "life"],
    likes: ["reader-a", "reader-f"],
    likesCount: 2,
    comments: [],
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
];
