/**
 * Scripted conversations for the mock voice provider. These only ever appear in calls
 * marked `simulated: true`; the app shows a SIMULATED badge on them. Everything
 * downstream (analysis, memory, flags, escalation rules) runs for real.
 */
export const SCRIPTS = {
  'checkin-dizzy': [
    { role: 'assistant', text: "Hello Mia, it's Belletje. Is now a good moment for our little chat?" },
    { role: 'user', text: 'Oh hello dear. Yes, yes, I have my coffee here.' },
    { role: 'assistant', text: 'Lovely. I was thinking about Lotte — how did her exam go yesterday?' },
    { role: 'user', text: 'She passed! She rang me last night, she was so happy. I was so nervous for her.' },
    { role: 'assistant', text: "That's wonderful news, you must be proud. It sounded like a bit of a restless night for you, though?" },
    { role: 'user', text: "Yes, I didn't sleep well. And I felt dizzy again this morning when I got up. It passed after a while." },
    { role: 'assistant', text: "I'm sorry to hear that. When did it happen — before or after breakfast? Have you had your tablet?" },
    { role: 'user', text: "Before breakfast. I've had my tablet now and some bread. I haven't been to the bakery yet, I didn't feel up to it." },
    { role: 'assistant', text: "That sounds sensible. It may be worth mentioning the dizziness to Dr Smeets — I'll let Tom know as well. What are your plans for today?" },
    { role: 'user', text: 'Maybe the garden this afternoon if I feel better. And my crossword.' },
    { role: 'assistant', text: "The garden sounds perfect. I'll send Tom a short note. Take it easy this morning, Mia, and we'll talk tomorrow. Bye for now." },
    { role: 'user', text: 'Bye dear, thank you for calling.' },
  ],
  'checkin-fine': [
    { role: 'assistant', text: "Hello Mia, it's Belletje. Is now a good moment for our little chat?" },
    { role: 'user', text: 'Yes of course. I just got back from the bakery.' },
    { role: 'assistant', text: 'Lovely, a good walk then. How did Lotte get on with her exam?' },
    { role: 'user', text: 'Very well, she passed. We are all so glad.' },
    { role: 'assistant', text: "Wonderful. And how are you feeling today?" },
    { role: 'user', text: 'Good, I slept well. Off to the garden later.' },
    { role: 'assistant', text: "That's great to hear. I'll let Tom know. Enjoy the garden, Mia. Bye for now." },
    { role: 'user', text: 'Bye bye.' },
  ],
  'mia-ok': [
    { role: 'assistant', text: 'Mia, this is Belletje. Your watch detected a fall. Are you okay?' },
    { role: 'user', text: "Oh — yes, I'm fine. I dropped the watch on the floor, I'm sorry." },
    { role: 'assistant', text: "Good. I'll let Tom know everything is okay. Take care." },
  ],
  'mia-help': [
    { role: 'assistant', text: 'Mia, this is Belletje. Your watch detected a fall. Are you okay?' },
    { role: 'user', text: "I've fallen in the kitchen, I can't get up. My hip hurts." },
    { role: 'assistant', text: "I'm calling Tom right now. Stay where you are. Help is coming." },
  ],
  'tom-yes': [
    { role: 'assistant', text: "Tom, this is Belletje calling about your mother, Mia Jacobs. Her watch detected a fall and she isn't answering her phone. She is at Voorbeeldstraat 12, Maastricht. Can you go now?" },
    { role: 'user', text: "Yes — yes, I'm going now. I'm ten minutes away." },
    { role: 'assistant', text: "Thank you. I've marked that help is on the way. The details are in the app." },
  ],
  'tom-no': [
    { role: 'assistant', text: "Tom, this is Belletje calling about your mother, Mia Jacobs. Her watch detected a fall and she isn't answering her phone. Can you go now?" },
    { role: 'user', text: "No, I can't, I'm in Amsterdam for work. Please try someone else." },
    { role: 'assistant', text: "Understood. I'll try Mr Hendriks right away." },
  ],
  'neighbour-yes': [
    { role: 'assistant', text: 'Mr Hendriks, this is Belletje calling about your neighbour Mia Jacobs. Her watch detected a fall and neither she nor her son could be reached. You have the spare key. Can you go and check on her now?' },
    { role: 'user', text: "Yes, I'll go over straight away." },
    { role: 'assistant', text: "Thank you. I've marked that help is on the way." },
  ],
  'neighbour-no': [
    { role: 'assistant', text: 'Mr Hendriks, this is Belletje calling about your neighbour Mia Jacobs. Can you go and check on her now?' },
    { role: 'user', text: "No, I'm not at home, I'm sorry." },
    { role: 'assistant', text: "Understood. I'll alert the alarm centre right away." },
  ],
};

export const DEFAULT_SCRIPT_BY_KIND = {
  checkin: 'checkin-dizzy',
  escalation_mia: null, // default: no answer (scenario 2)
  escalation_tom: 'tom-yes',
  escalation_neighbour: 'neighbour-yes',
};
