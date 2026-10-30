/**
 * Question bank: general competency.
 *
 * Drawn on by **every** position, whatever its category. These are the
 * questions asked in a real interview regardless of the job — how you
 * handle disagreement, what you did when you were wrong, why you want
 * this role — and they are the reason all 700 positions can be offered
 * rather than only the ones with a specialist bank written.
 *
 * Writing them once is the point. "Tell me about a time you disagreed
 * with your manager" is the same question for a nurse and a developer,
 * and 700 copies of it would be 700 things to maintain.
 *
 * A caution worth keeping in mind: competency answers are judgement,
 * not fact. Each question below has one option that is clearly the
 * better interview answer and three that are recognisable mistakes —
 * but a candidate who disagrees with a marking is not necessarily
 * wrong, and the explanation says *why* so they can argue with it.
 */

/** @type {Array<{q: string, o: string[], a: number, w: string, t: string}>} */
const JUNIOR = [
  {
    q: 'You are asked a question you do not know the answer to. What is the best response?',
    o: [
      'Guess confidently and hope it is right',
      'Say you do not know, then describe how you would find out',
      'Change the subject to something you do know',
      'Admit you do not know and stop there',
    ],
    a: 1,
    w: 'Interviewers expect gaps; what they are testing is honesty and method. "I have not used that, but I would start by checking the documentation and asking whoever owns it" shows both. Bluffing is usually obvious and ends the credibility of everything else you said.',
    t: 'interview-technique',
  },
  {
    q: 'What is the STAR method for?',
    o: [
      'Rating your own performance',
      'Structuring an answer: Situation, Task, Action, Result',
      'Ranking job offers',
      'Preparing a CV',
    ],
    a: 1,
    w: 'It stops a rambling answer. Most people over-explain the situation and under-explain their own action — which is the part being assessed. Finish with the result, ideally a number.',
    t: 'interview-technique',
  },
  {
    q: 'Why do interviewers ask "tell me about yourself"?',
    o: [
      'To hear your life story',
      'To hear a short, relevant summary of why you fit this role',
      'To check you can talk',
      'To fill time at the start',
    ],
    a: 1,
    w: 'It is an invitation to frame the rest of the interview, not a biography. Two minutes: what you do now, one thing you are proud of, why this role. Starting at school wastes the best moment you get.',
    t: 'interview-technique',
  },
  {
    q: 'You made a mistake that affected your team. What should you do first?',
    o: [
      'Fix it quietly before anyone notices',
      'Tell whoever is affected straight away, then fix it',
      'Wait to see whether it causes a problem',
      'Work out who else contributed',
    ],
    a: 1,
    w: 'Speed of disclosure limits the damage, and people remember how you behaved far longer than the mistake. Hiding it turns a small error into a question about whether you can be trusted.',
    t: 'accountability',
  },
  {
    q: 'What is the best answer to "what is your greatest weakness?"',
    o: [
      '"I work too hard"',
      'A real weakness, with what you are doing about it',
      '"I have none I can think of"',
      'Something irrelevant to the job',
    ],
    a: 1,
    w: 'The disguised-strength answer is recognised instantly and reads as evasive. A genuine one — with evidence that you noticed and acted — shows self-awareness, which is what is actually being tested.',
    t: 'interview-technique',
  },
  {
    q: 'You disagree with how a task has been assigned to you. What is the best approach?',
    o: [
      'Do it your own way and explain later',
      'Ask why it is being done that way, then make your case with reasons',
      'Do it as asked without comment',
      'Raise it with your manager’s manager',
    ],
    a: 1,
    w: 'Asking first often reveals a constraint you did not know about. If it does not, you have earned the standing to disagree. Going around someone, or going silent, both cost more than the disagreement would have.',
    t: 'collaboration',
  },
  {
    q: 'What should you do when you are given more work than you can finish?',
    o: [
      'Work longer hours until it is done',
      'Say so early, with what you can deliver and by when',
      'Start with the easiest tasks',
      'Deliver everything late but complete',
    ],
    a: 1,
    w: 'The problem is not the workload, it is the surprise. Raised early it is a planning decision; raised at the deadline it is a failure. Bring a proposal — what you would drop or delay — rather than only the problem.',
    t: 'prioritisation',
  },
  {
    q: 'What is a good question to ask at the end of an interview?',
    o: [
      '"What does the company do?"',
      'Something specific about the team, the work, or how success is measured',
      '"How much holiday do I get?"',
      'Nothing; it saves everyone time',
    ],
    a: 1,
    w: 'Having no questions reads as no interest. Asking what the company does shows you did not look. Terms matter but belong after an offer — or at least after you have asked about the work.',
    t: 'interview-technique',
  },
  {
    q: 'You receive critical feedback you think is unfair. What is the best response in the moment?',
    o: [
      'Defend yourself immediately',
      'Ask for a specific example so you understand what was seen',
      'Accept it and say nothing',
      'Raise it with HR',
    ],
    a: 1,
    w: 'An example turns a judgement into something you can both look at. Often the gap is one incident you remember differently — and you cannot resolve that until it is named. Defending first ends the conversation.',
    t: 'feedback',
  },
  {
    q: 'What does being "proactive" at work actually mean?',
    o: [
      'Working faster than others',
      'Noticing what needs doing and starting it without being asked',
      'Volunteering for every task',
      'Suggesting many ideas',
    ],
    a: 1,
    w: 'It is about initiative, not volume. Volunteering for everything and finishing little is the common failure. Noticing a recurring problem and quietly fixing it is the behaviour people actually mean.',
    t: 'work-habits',
  },
  {
    q: 'A colleague asks for help while you are busy with your own deadline. What is best?',
    o: [
      'Drop your work and help',
      'Say when you can help, or point them to someone who can now',
      'Say you are busy',
      'Help briefly and return to your work',
    ],
    a: 1,
    w: 'A concrete time, or a redirection, is useful to them and honest about your commitment. "I am busy" leaves them stuck; dropping everything just moves the missed deadline to you.',
    t: 'collaboration',
  },
  {
    q: 'What should you do in the first week of a new job?',
    o: [
      'Suggest improvements to existing processes',
      'Ask questions, write things down, and learn how things currently work',
      'Keep quiet until given work',
      'Complete as many tasks as possible',
    ],
    a: 1,
    w: 'Early suggestions usually miss a constraint you have not met yet, and they cost goodwill. The week when it is acceptable to ask about everything is short — use it.',
    t: 'work-habits',
  },
  {
    q: 'Why do interviewers ask "why do you want this role?"',
    o: [
      'To check you need a job',
      'To see whether you understand the role and have a reason beyond any job',
      'To test your enthusiasm',
      'To compare you with other candidates',
    ],
    a: 1,
    w: 'An answer that would fit any employer tells them you will leave for any employer. Naming something specific — the work, the product, the problem — is what separates it from a form letter.',
    t: 'interview-technique',
  },
  {
    q: 'You do not understand an instruction you have been given. What should you do?',
    o: [
      'Start and work it out as you go',
      'Ask for clarification before starting',
      'Ask a colleague instead of your manager',
      'Do your best interpretation',
    ],
    a: 1,
    w: 'Two minutes of asking beats two days in the wrong direction. People worry it looks incapable; delivering the wrong thing confidently looks far worse.',
    t: 'communication',
  },
  {
    q: 'What is the most useful thing to bring to a one-to-one with your manager?',
    o: [
      'A list of completed tasks',
      'What is blocking you, and anything you need a decision on',
      'Nothing; let them lead',
      'Concerns about colleagues',
    ],
    a: 1,
    w: 'The meeting is most valuable for things only they can unblock. A status list is usually already visible elsewhere, and reading it out spends the one slot where you have their attention.',
    t: 'communication',
  },
  {
    q: 'How should you respond when a project you worked on is cancelled?',
    o: [
      'Treat it as wasted effort',
      'Capture what was learnt and what can be reused, then move on',
      'Ask for the decision to be reversed',
      'Request different work in future',
    ],
    a: 1,
    w: 'Cancellation is normal and usually reflects changed priorities, not your work. How you take it is noticed — particularly by whoever has to assign the next piece of work.',
    t: 'resilience',
  },
  {
    q: 'What is the point of taking notes in meetings?',
    o: [
      'To look engaged',
      'To record decisions and what you agreed to do',
      'To have a transcript',
      'To avoid speaking',
    ],
    a: 1,
    w: 'Decisions and actions are the parts that get disputed later. A verbatim transcript is unusable; three lines of "we decided X, I am doing Y by Friday" is worth re-reading.',
    t: 'work-habits',
  },
  {
    q: 'An interviewer asks about a gap in your CV. What is the best approach?',
    o: [
      'Avoid the subject',
      'State briefly what it was and what you did during it',
      'Blame circumstances',
      'Give a detailed personal explanation',
    ],
    a: 1,
    w: 'Gaps are common and rarely disqualifying; evasion is what raises concern. One or two sentences, then move to what you did — study, caring, contracting — and let it be ordinary.',
    t: 'interview-technique',
  },
  {
    q: 'What makes written communication at work effective?',
    o: [
      'Being as brief as possible',
      'Saying what you need, from whom, and by when, near the top',
      'Including all relevant background',
      'Using formal language',
    ],
    a: 1,
    w: 'People read the first lines and skim the rest. Burying the request under context means it gets missed — put the ask first and the background underneath for whoever wants it.',
    t: 'communication',
  },
  {
    q: 'You finish your work early. What is the best use of the time?',
    o: [
      'Wait to be given more',
      'Ask what would be most useful, or improve something you own',
      'Start the next sprint’s work',
      'Leave early',
    ],
    a: 1,
    w: 'Asking takes a moment and avoids starting something that is about to change. Having a standing answer — tests, documentation, a nagging small fix — means the time is never wasted.',
    t: 'work-habits',
  },
];

/** @type {Array<{q: string, o: string[], a: number, w: string, t: string}>} */
const MID = [
  {
    q: 'A deadline is going to be missed. When should you say so?',
    o: [
      'When you are certain it will be missed',
      'As soon as you believe it is likely, with a revised estimate',
      'At the deadline, with the finished work',
      'When somebody asks for a status update',
    ],
    a: 1,
    w: 'Early warning gives others options — cut scope, add help, move a dependency. Certainty arrives too late to use. Bring a new date rather than only the bad news.',
    t: 'prioritisation',
  },
  {
    q: 'You are asked to deliver something you think is the wrong solution. What do you do?',
    o: [
      'Build it as specified',
      'Make the case once with reasons, then commit to whichever is decided',
      'Build what you think is right',
      'Escalate before starting',
    ],
    a: 1,
    w: 'Disagree and commit. Saying nothing wastes your judgement; refusing to accept a decision once made makes you impossible to work with. Record the concern, then support the choice properly.',
    t: 'collaboration',
  },
  {
    q: 'How should you handle a colleague who consistently misses commitments to you?',
    o: [
      'Raise it with their manager',
      'Speak to them directly first, about the pattern and its effect',
      'Work around them',
      'Stop depending on them',
    ],
    a: 1,
    w: 'Going to a manager first turns a conversation into a complaint, and they usually find out. Describing the effect rather than the character keeps it solvable — there is often a cause you did not know about.',
    t: 'conflict',
  },
  {
    q: 'What is the most important thing when handing over work before leaving a team?',
    o: [
      'Complete documentation',
      'Making sure someone can actually run and change it, not just read about it',
      'A final status report',
      'Introducing your contacts',
    ],
    a: 1,
    w: 'Documentation nobody has tested is a guess. Watching someone else do the task, with you available, is what reveals the step that only existed in your head.',
    t: 'collaboration',
  },
  {
    q: 'You are given a task with unclear requirements and the person who asked is unavailable. What is best?',
    o: [
      'Wait until they return',
      'Write down your assumptions, start on what is certain, and confirm when you can',
      'Build the most complete version',
      'Ask someone else to decide',
    ],
    a: 1,
    w: 'Recorded assumptions make the eventual correction cheap and show your reasoning. Waiting wastes time; building everything wastes more, and still may be wrong.',
    t: 'ambiguity',
  },
  {
    q: 'How do you decide what to work on when everything is urgent?',
    o: [
      'In the order requested',
      'By consequence of delay, and whether anything else is blocked on it',
      'Shortest first',
      'Whatever the most senior person asked for',
    ],
    a: 1,
    w: 'Unblocking others multiplies, so it usually comes first even when small. If genuine priorities conflict, that is a decision to surface rather than resolve silently by choosing one.',
    t: 'prioritisation',
  },
  {
    q: 'What is the right way to give difficult feedback to a peer?',
    o: [
      'In a group, so it is understood as a team standard',
      'Privately, promptly, about specific behaviour and its effect',
      'Through their manager',
      'In writing, so there is a record',
    ],
    a: 1,
    w: 'Private and specific is what makes it usable. Public correction gets heard as humiliation, so the content is lost. Saved up for months, it is also no longer actionable.',
    t: 'feedback',
  },
  {
    q: 'A process on your team is inefficient but everyone is used to it. What is the best first step?',
    o: [
      'Propose a replacement',
      'Find out why it exists — the reason is often still valid',
      'Stop following it and demonstrate the alternative',
      'Raise it in a retrospective',
    ],
    a: 1,
    w: 'Processes usually encode a past failure. Knowing which one tells you whether it can go or needs replacing with something cheaper — and the answer is what makes the proposal persuasive.',
    t: 'process',
  },
  {
    q: 'How do you respond when a stakeholder keeps adding to the scope of your work?',
    o: [
      'Absorb it to keep the relationship good',
      'Accept it explicitly as a trade: what moves out, or what date moves',
      'Refuse anything not agreed at the start',
      'Deliver the original scope and discuss the rest later',
    ],
    a: 1,
    w: 'Scope is not the problem; silent scope is. Making the exchange visible each time keeps it a shared decision instead of a surprise about the deadline.',
    t: 'stakeholders',
  },
  {
    q: 'What should you do when you realise a decision you argued for was wrong?',
    o: [
      'Wait to see whether it matters',
      'Say so early, with what you now think and why',
      'Let whoever disagreed raise it',
      'Fix it quietly',
    ],
    a: 1,
    w: 'It costs very little and buys a great deal of credibility. People who change position on evidence are trusted with bigger decisions; the ones who defend a position past the evidence are not.',
    t: 'accountability',
  },
  {
    q: 'How do you work effectively with someone whose style you find difficult?',
    o: [
      'Minimise contact',
      'Adapt how you communicate and focus on the shared outcome',
      'Ask to be reassigned',
      'Address the style directly',
    ],
    a: 1,
    w: 'Some of it is preference rather than a problem — someone blunt is not necessarily rude. Adapting first is cheap. If it is genuinely affecting the work, name the behaviour and its effect, not the personality.',
    t: 'conflict',
  },
  {
    q: 'What is the purpose of a retrospective?',
    o: [
      'To record what was delivered',
      'To change how the team works, based on what just happened',
      'To raise concerns about individuals',
      'To report progress upwards',
    ],
    a: 1,
    w: 'A retrospective producing no change is theatre, and people disengage from it quickly. One or two actions with an owner beat a long list nobody revisits.',
    t: 'process',
  },
  {
    q: 'You are asked to estimate work you have never done before. What is the best approach?',
    o: [
      'Give your best single number',
      'Give a range, state the assumptions, and offer to firm it up after a short investigation',
      'Decline to estimate',
      'Double your instinct',
    ],
    a: 1,
    w: 'A range communicates uncertainty honestly; a single number is heard as a commitment. A timeboxed spike is usually cheaper than the overrun that follows a confident guess.',
    t: 'estimation',
  },
  {
    q: 'How should you handle being blamed for something that was not your fault?',
    o: [
      'Accept it to avoid conflict',
      'Correct the record factually, without attacking whoever said it',
      'Let others defend you',
      'Respond publicly with evidence',
    ],
    a: 1,
    w: 'Accepting it sets a precedent and can affect decisions about you. Correcting the facts calmly works; making it personal shifts attention from the record to the argument.',
    t: 'conflict',
  },
  {
    q: 'What makes a handover to a support or on-call team effective?',
    o: [
      'A full architecture overview',
      'The symptoms they will see, what to do, and when to escalate',
      'A list of recent changes',
      'Access to the code',
    ],
    a: 1,
    w: 'They need to act at three in the morning without context. Anything requiring interpretation gets skipped, and the escalation rule matters as much as the fix.',
    t: 'process',
  },
  {
    q: 'A junior colleague asks you a question you answered last week. What is best?',
    o: [
      'Point them to the earlier answer',
      'Answer it, then consider why it did not stick — unclear answer, or missing documentation',
      'Tell them to take notes',
      'Answer it briefly',
    ],
    a: 1,
    w: 'A repeated question is usually a signal about the explanation or the documentation rather than the person. Treating it as their failing stops the questions, which is the worst outcome.',
    t: 'mentoring',
  },
  {
    q: 'How do you decide whether to automate a repetitive task?',
    o: [
      'Always automate it',
      'By how often it recurs, how long it takes, and how stable it is',
      'When it becomes annoying',
      'When you have spare time',
    ],
    a: 1,
    w: 'Automating something that changes shape every month costs more than it saves. Frequency times duration against build-and-maintain is the calculation — and it is often worth doing badly first.',
    t: 'work-habits',
  },
  {
    q: 'What should you do when two stakeholders give you conflicting priorities?',
    o: [
      'Follow the more senior one',
      'Put the conflict in front of both and ask them to resolve it',
      'Split your time between them',
      'Do whichever is quicker first',
    ],
    a: 1,
    w: 'Choosing privately means absorbing a decision that is not yours, and being wrong in someone’s eyes either way. Splitting usually delivers neither. Surfacing it is faster and fairer.',
    t: 'stakeholders',
  },
  {
    q: 'Why is "we have always done it this way" a weak justification?',
    o: [
      'It is disrespectful to tradition',
      'It describes a habit rather than a reason, so nobody can tell whether it still applies',
      'It discourages new staff',
      'It is usually untrue',
    ],
    a: 1,
    w: 'The practice may well be right — but without the reason there is no way to know when it stops being right. Recovering the reason is more useful than winning the argument.',
    t: 'process',
  },
  {
    q: 'What is the most useful thing to do immediately after an incident is resolved?',
    o: [
      'Close the ticket',
      'Write down the timeline while it is fresh',
      'Inform stakeholders',
      'Deploy a permanent fix',
    ],
    a: 1,
    w: 'Memory degrades within hours, and the timeline is what the review depends on. Everything else — communication, permanent fixes — is easier once the sequence is recorded accurately.',
    t: 'incidents',
  },
];

/** @type {Array<{q: string, o: string[], a: number, w: string, t: string}>} */
const SENIOR = [
  {
    q: 'A team member is underperforming. What is the right first step?',
    o: [
      'Begin a formal process',
      'Find out why, in a private conversation — capability, clarity, or something outside work',
      'Reduce their responsibilities',
      'Raise it with your manager',
    ],
    a: 1,
    w: 'The remedy differs completely by cause: unclear expectations need clarity, a skills gap needs support, personal difficulty needs time. Starting formally before knowing which usually fixes none of them.',
    t: 'leadership',
  },
  {
    q: 'How do you decide when to make a decision yourself rather than seek consensus?',
    o: [
      'Always seek consensus',
      'By whether it is reversible and how much the team must live with it',
      'By how senior you are',
      'By how quickly it is needed',
    ],
    a: 1,
    w: 'Reversible decisions should be made fast by whoever is closest. Hard-to-reverse ones that the team lives with daily deserve their input — and consensus on everything is its own failure, because nothing moves.',
    t: 'leadership',
  },
  {
    q: 'Your team is consistently delivering late. What do you investigate first?',
    o: [
      'Individual productivity',
      'Whether estimates are wrong, or work is being added, or something is blocking',
      'Whether the team is large enough',
      'The development process',
    ],
    a: 1,
    w: 'Late delivery is a symptom with several very different causes. Reaching for productivity first is the common mistake and the most damaging, because it is heard as blame for a systemic problem.',
    t: 'leadership',
  },
  {
    q: 'How should you respond when asked to commit to a date you believe is unrealistic?',
    o: [
      'Commit and manage expectations later',
      'Say what is achievable, what would have to change for the date, and let them choose',
      'Refuse to commit',
      'Commit with a stated risk',
    ],
    a: 1,
    w: 'Presenting the options makes it a business decision rather than an argument about optimism. Agreeing to a date you do not believe in spends credibility you will need when you report the slip.',
    t: 'stakeholders',
  },
  {
    q: 'What is the main risk of being the most experienced person on a team?',
    o: [
      'Being given too much work',
      'People stop challenging your decisions, so your mistakes go uncorrected',
      'Becoming bored',
      'Being promoted away from the work',
    ],
    a: 1,
    w: 'Deference is more dangerous than disagreement. Actively inviting challenge — and visibly changing your mind sometimes — is what keeps it available when you need it.',
    t: 'leadership',
  },
  {
    q: 'How do you build trust with a team you have just taken over?',
    o: [
      'Make early visible changes',
      'Listen first, then fix something they have been complaining about',
      'Set out your standards clearly',
      'Meet each person individually',
    ],
    a: 1,
    w: 'Early changes made before you understand the context usually undo something that was load-bearing. Fixing a known irritant proves you listened and that listening leads somewhere.',
    t: 'leadership',
  },
  {
    q: 'When is it right to say no to a request from senior management?',
    o: [
      'Never; find a way',
      'When it cannot be done safely or honestly — with the reason and an alternative',
      'When the team is already busy',
      'When you disagree with the strategy',
    ],
    a: 1,
    w: 'Saying yes to something undeliverable postpones the no to a worse moment. Being busy is a trade-off to negotiate, not a refusal — the genuine no is for things that cannot be done safely or honestly.',
    t: 'leadership',
  },
  {
    q: 'What is the most common failure when scaling a team quickly?',
    o: [
      'Hiring the wrong people',
      'Growing faster than the team can absorb and train, so quality and culture dilute',
      'Running out of budget',
      'Communication overhead',
    ],
    a: 1,
    w: 'Every new person consumes existing capacity before adding any. Doubling a team can make it slower for a quarter, and skipping that cost is how standards quietly disappear.',
    t: 'leadership',
  },
  {
    q: 'How do you handle a decision made above you that you believe is wrong?',
    o: [
      'Implement it without comment',
      'Raise the concern with reasons through the right channel, then support the decision properly',
      'Implement it slowly',
      'Tell the team you disagree',
    ],
    a: 1,
    w: 'Telling the team you disagree while asking them to deliver it guarantees a half-hearted effort and makes the decision look imposed. Disagree upwards, commit downwards.',
    t: 'leadership',
  },
  {
    q: 'What does good delegation require beyond assigning the task?',
    o: [
      'Regular progress checks',
      'Being clear about the outcome and the constraints, then leaving the method to them',
      'Choosing the most capable person',
      'Documenting the requirements',
    ],
    a: 1,
    w: 'Delegating the task but not the decisions is supervision with extra steps. Stating the outcome and the real boundaries lets someone own it — and owning it is where people actually develop.',
    t: 'leadership',
  },
  {
    q: 'How should credit be handled for work a team delivered?',
    o: [
      'The lead represents the team',
      'Name who did what, specifically, where it is visible',
      'Credit the team collectively',
      'Let the work speak for itself',
    ],
    a: 1,
    w: 'Collective credit quietly accrues to whoever is most visible, usually the lead. Specific attribution costs nothing and is one of the few things that reliably retains good people.',
    t: 'leadership',
  },
  {
    q: 'What is the most important quality in a post-incident review?',
    o: [
      'Thoroughness',
      'Blamelessness — so people report accurately rather than defensively',
      'Speed',
      'Senior attendance',
    ],
    a: 1,
    w: 'Accuracy depends on people volunteering what they did, including the parts that look careless. One blame-oriented review teaches everybody to withhold, and every review afterwards is less useful.',
    t: 'incidents',
  },
  {
    q: 'How do you evaluate whether to build something in-house or buy it?',
    o: [
      'Build if the team is capable',
      'By whether it is core to what differentiates you, and the full cost of owning it forever',
      'Buy whenever a product exists',
      'By initial cost comparison',
    ],
    a: 1,
    w: 'Building something commodity means maintaining it for a decade for no advantage. The cost people miss is not the build — it is the ongoing ownership nobody budgets for.',
    t: 'strategy',
  },
  {
    q: 'A capable engineer wants to leave for more money. What is the right response?',
    o: [
      'Match the offer',
      'Find out whether money is the real reason before deciding anything',
      'Let them go',
      'Offer a promotion',
    ],
    a: 1,
    w: 'Money is often the acceptable version of a different reason — the work, the manager, the lack of progression. Counter-offers against those fail within months, and you have paid for the delay.',
    t: 'leadership',
  },
  {
    q: 'What is the problem with measuring individual output on a team?',
    o: [
      'It is hard to measure accurately',
      'It rewards visible individual work over the collaboration the result depends on',
      'It demotivates lower performers',
      'It takes too long',
    ],
    a: 1,
    w: 'People optimise for what is counted. Measuring individual throughput reliably reduces review, mentoring and helping — exactly the work that is invisible and makes the team function.',
    t: 'leadership',
  },
  {
    q: 'How do you keep technical standards without becoming a bottleneck?',
    o: [
      'Review everything personally',
      'Write the standard down, build it into tooling, and spread review across the team',
      'Delegate to one trusted deputy',
      'Set standards and trust the team',
    ],
    a: 1,
    w: 'A standard enforced by one person is that person’s availability. Automated where possible and shared where not, it survives holidays — and survives you leaving.',
    t: 'leadership',
  },
  {
    q: 'When should you push back on a request to cut quality to hit a date?',
    o: [
      'Always',
      'When the cost is hidden or lands on someone else, rather than being a chosen trade',
      'Never; the date is a business decision',
      'When the team objects',
    ],
    a: 1,
    w: 'Deliberately deferring quality for a known reason is legitimate, if it is recorded and paid back. The version to resist is the one where the cost is invisible to whoever is choosing it.',
    t: 'strategy',
  },
  {
    q: 'What is the first sign that a team has too much work in progress?',
    o: [
      'Missed deadlines',
      'Things are started but few are finished, and context switching rises',
      'People working late',
      'Complaints in retrospectives',
    ],
    a: 1,
    w: 'Deadlines slip late, after the cause has been running for weeks. Many things in flight and few completed is visible immediately — which is why limiting work in progress usually beats working harder.',
    t: 'process',
  },
  {
    q: 'How do you decide what not to do?',
    o: [
      'By what has the least demand',
      'By what you would stop doing if you had to choose, stated explicitly rather than by neglect',
      'By what is hardest',
      'By what has no owner',
    ],
    a: 1,
    w: 'Everything survives as a half-commitment unless something is actually dropped. Saying "we are not doing this" is harder than quietly deprioritising it, and it is the only version that frees capacity.',
    t: 'strategy',
  },
  {
    q: 'What is the real cost of a long-lived "temporary" workaround?',
    o: [
      'The time to build it',
      'Everything built on top assumes it, so removing it gets harder every month',
      'Confusing new starters',
      'Technical debt interest',
    ],
    a: 1,
    w: 'Workarounds become load-bearing. The cost is not the hack but the dependencies that accumulate around it, which is why a removal date agreed at the time is worth more than the intention to revisit it.',
    t: 'strategy',
  },
];

/**
 * Turns the compact entries into what `InterviewQuestion` stores.
 * @param {Array<object>} entries - Compact questions.
 * @param {string} level - junior, mid or senior.
 * @returns {Array<object>} Expanded questions.
 */
function expand(entries, level) {
  return entries.map((entry) => ({
    level,
    text: entry.q,
    options: entry.o.map((text) => ({ text })),
    correctIndex: entry.a,
    explanation: entry.w,
    topic: entry.t,
  }));
}

/** The bank every position draws on. */
export const GENERAL_BANK = {
  category: '__general__',
  questions: [...expand(JUNIOR, 'junior'), ...expand(MID, 'mid'), ...expand(SENIOR, 'senior')],
};

export default GENERAL_BANK;
