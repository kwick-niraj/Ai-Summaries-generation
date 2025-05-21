function generateUserPrompt(meta, isFirstHalf = true) {
  const {
    title,
    author,
    publication_date,
    genre = [],
    target_audience = [],
    "core_themes": CoreThemes = [],
    "key_concepts_lessons": KeyConcepts = [],
    "primary_purpose": PrimaryPurpose = '',
    "structure_format": StructureFormat = {},
    "style_tone": StyleTone = [],
    "notable_features": NotableFeatures = []
  } = meta;

  // 🧱 Structure
  let structureLine = "7–9 narrative-driven thematic sections.";
  if (StructureFormat?.Organization?.toLowerCase().includes("chapter") || StructureFormat?.Organization?.toLowerCase().includes("tip")) {
    structureLine += " Group related chapters, tips, or ideas into cohesive themes.";
  }
  structureLine += "Conclusion: Write a 1800-character instructional-style conclusion for a nonfiction book summary using a mentor-like tone, including a short list of bullet-point takeaways (each 10–12 words long) based on the book’s original content, followed by a longer, emotionally intelligent final paragraph that offers reassurance and encourages real-world action.";

  // 🧱 Tone
  // const metaTone = StyleTone.length > 0 ? StyleTone.join(', ') : "natural, clear, and accessible";
  // const toneAndStructure = summaryToneAndStructure;

  // const tone = `story_wisdom, tactical_breakdown, ${metaTone}`
  // const tone = metaTone;


  // 🧱 Bullet rules
  const bulletRule = "sparingly for summarizing grouped tools, techniques, or insights — not for every section";

  // 🧱 Summary Strategy (flexible, genre-agnostic)
  // const summaryStrategy = `Summary Type: ${toneAndStructure.structure_type}.\nDescription: ${toneAndStructure.description} ${toneAndStructure.structure}`;

  const summaryStrategy = `
  {
  "structure_type": "story_wisdom",
  "description": "Use the following structure configuration to guide the summary writing process.\n
  • The summary should follow the **story_wisdom** structure — Structure the summary using emotionally engaging, human-centered storytelling and easy to understand language. It is acceptable to introduce characters or roles from the original book to set up the initial context. Preserve the original chapter structure for 80% and paraphrase the stories and examples provided by the author.
  Use a hybrid tone across the summary that seamlessly blends narrative, story, and reflection in the following way:
  1. Start each chapter with an **engaging, flowing introduction** that sets up the theme in a human, relatable way. Use reflective yet accessible language to draw the reader in — avoid sounding academic or formal.
  2.  When referencing real-life stories or examples from the book, shift into immersive storytelling. Retell these moments in a vivid but grounded way, using unnamed, relatable characters (e.g., “a kid frustrated with work,” “a parent chasing security”) to preserve emotional closeness. Keep scenes concise and emotionally believable — include small actions, reactions, and emotional turning points to make the lesson feel lived, not just told. Avoid dramatization or overly literary flair. The pacing should feel like a memory being naturally shared, not a scene from fiction.
  3. As you explain core ideas, **embed insights subtly within the narration** using a natural **conversational tone**. Speak directly to the reader without announcing lessons. Let takeaways emerge through phrases like “it became clear,” “most people don’t notice this,” or “many fall into the same habit.” Avoid any list-like phrasing or labeled takeaways. Let the insight feel discovered — not pointed out.
  Maintain a warm, thoughtful tone throughout. The reader should feel like they’re being guided through a lived experience, not reading a textbook or summary. Avoid formal transitions and instead focus on emotional flow, mental clarity, and human resonance.
}
`
// • 5% of the summary should follow the **“tactical_breakdown”** structure — Structure the summary as a clear, practical walkthrough of the book’s strategies. Each chapter should cover a core idea or principle and explain how it works in real-life situations. Write in a clear, third-person, instructional tone. While the summary itself should flow in paragraphs, any actionable steps, techniques, or tools mentioned within a chapter should be listed using bullet points for clarity. Avoid second-person language (“you”), and use general, relatable examples to ground the advice. Keep the language simple, direct, and helpful.

// Avoid treating the styles as separate sections. Let them blend naturally within each chapter.

  // 🧱 Avoid list (dynamic + generic)
  const avoid = [
    "Using words like (e.g., 'you', 'your')",
    `Mentioning the author directly (e.g., '${author} says...', '${author} believes...')`,
    "Overuse of bullet points or generic list formatting",
    "Reusing original chapter titles from the book",
    "Copying or closely imitating the book’s own phrasing or section names",
    "Jargon or complex vocabulary",
    "over-fictionalizing or introducing narrative embellishments that misrepresent real events or teachings. When describing characters (e.g., mentors, parents, friends), refer to their roles based on how they function in the author’s life, not how they could be dramatized."
  ];

//  • Bullet Points: ${bulletRule}

  return `
You are a professional nonfiction book summarizer.

Your job is to generate a natural, flowing, clear, engaging and deeply paraphrased summary of the following nonfiction book using the metadata and the formatting rules provided.

⸻

📘 Book Metadata:
• Title: ${title}
• Author: ${author}
• Genre: ${genre.join(', ')}
• First Published: ${publication_date}
• Target Audience: ${target_audience.join(', ')}

🎯 Primary Purpose:
${PrimaryPurpose}

🔑 Core Themes:
${CoreThemes.join(', ')}

🧠 Key Concepts:
${KeyConcepts.join(', ')}

📐 Structure:
${structureLine}

📝 Summary Strategy:
${summaryStrategy}

🎯 Writing Guidelines:
• Voice: Use a combination of second-person and  third-person voice
• Target Length: 25,000–30,000 characters

🚫 Avoid:
• ${avoid.join('\n• ')}

⚠️ Additional Instructions:
• Create concise, simple, and clear section titles. Each title should describe the core theme of the section using plain language (10-15 words max). Avoid poetic phrases, vague abstractions, or metaphors.
• Paraphrase deeply — no direct quotes
• Use metadata to guide summary focus, tone, and order — do not invent structure
• Ensure smooth transitions between sections and avoid isolated blocks
•	Preserve the 80% logical flow of concepts as in the original book.
•	Maintain factual alignment with the book’s original structure and narrative. Do not invent or exaggerate relationships, story setups, or character roles.s

You are generating the ${isFirstHalf ? 'first' : 'second'} half of a complete longform summary. The half summary will be approximately 25,000–30,000 characters across 4-5 chapters.

In this half, include only 4–5 chapters, adjusted to match the same level of depth, detail, and character count as you would in a full-length summary. Do not shorten content. The tone, structure, and pacing must remain consistent.
`.trim();
}

module.exports = {
  generateUserPrompt,
}