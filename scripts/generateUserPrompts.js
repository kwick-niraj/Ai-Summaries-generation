function generateUserPrompt(meta, summaryToneAndStructure, isFirstHalf = true) {
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
  structureLine += " Include a short Introduction (~800–1000 characters). Include a Conclusion (~800–1000 characters).";

  // 🧱 Tone
  const metaTone = StyleTone.length > 0 ? StyleTone.join(', ') : "neutral, clear, and accessible";
  const toneAndStructure = summaryToneAndStructure;

  // const tone = `story_wisdom, tactical_breakdown, ${metaTone}`
  const tone = metaTone;


  // 🧱 Bullet rules
  const bulletRule = "sparingly for summarizing grouped tools, techniques, or insights — not for every section";

  // 🧱 Summary Strategy (flexible, genre-agnostic)
  // const summaryStrategy = `Summary Type: ${toneAndStructure.structure_type}.\nDescription: ${toneAndStructure.description} ${toneAndStructure.structure}`;

  const summaryStrategy = `
  structure_type: Mixed- philosophical_reflection 50% + story_wisdom 30% + framework_stepwise 20%"
  description: Use the following structure configuration to guide the summary writing process. Apply each style proportionally based on its weight and purpose, blending them seamlessly throughout the chapters. 
  • 50% of the summary should follow the **“philosophical_reflection”** structure — Write the summary as a calm, thoughtful reflection on the book’s core psychological and spiritual ideas. Each chapter should explore one theme using metaphor, analogy, or simplified interpretation. Avoid poetic language unless essential. Maintain a neutral, meditative tone with smooth, idea-driven flow.\n\n• 30% of the summary should follow the **“story_wisdom”** structure — Structure the summary as a flowing narrative that uses emotionally engaging storytelling to explain key insights. Use broad, relatable life scenarios (e.g., 'a person overcoming chronic fear' or 'someone healing through belief') to illustrate how subconscious influence works. Use simple archetypes (e.g., 'a patient', 'a believer', 'a skeptical student') without names or fictional detail. Keep the narration natural and warm, using third-person voice.\n\n• 20% of the summary should follow the **“framework_stepwise”** structure — Present key principles or recurring spiritual laws in a clear, progressive flow. For example: belief → imagination → repetition → results. Use simplified logic to break abstract ideas into digestible stages or mental habits. Maintain a structured but gentle instructional tone.\n\nAvoid splitting these styles into separate blocks. Let reflective passages lead, enrich them with relatable human experiences, and reinforce key ideas through simple structures or mental models. The final summary should feel spiritually thoughtful, emotionally resonant, and intellectually clear.

`
// • 5% of the summary should follow the **“tactical_breakdown”** structure — Structure the summary as a clear, practical walkthrough of the book’s strategies. Each chapter should cover a core idea or principle and explain how it works in real-life situations. Write in a clear, third-person, instructional tone. While the summary itself should flow in paragraphs, any actionable steps, techniques, or tools mentioned within a chapter should be listed using bullet points for clarity. Avoid second-person language (“you”), and use general, relatable examples to ground the advice. Keep the language simple, direct, and helpful.

// Avoid treating the styles as separate sections. Let them blend naturally within each chapter.

  // 🧱 Avoid list (dynamic + generic)
  const avoid = [
    "Using words like (e.g., 'you', 'your')",
    `Mentioning the author directly (e.g., '${author} says...', '${author} believes...')`,
    "Overuse of bullet points or generic list formatting",
    "Reusing original chapter titles or structure from the book",
    "Copying or closely imitating the book’s own phrasing or section names"
  ];


  return `
You are a professional nonfiction book summarizer.

Your job is to generate a flowing, clear, deeply paraphrased summary of the following nonfiction book using the metadata and the formatting rules provided.

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
• Voice: Second-person and/or third-person
• Bullet Points: ${bulletRule}
• Target Length: 22,000–25,000 characters

🚫 Avoid:
• ${avoid.join('\n• ')}

⚠️ Additional Instructions:
• Create concise, simple, and clear section titles. Each title should describe the core theme of the section using plain language (10-15 words max). Avoid poetic phrases, vague abstractions, or metaphors. Do not reuse or quote original chapter titles from the book.
• Paraphrase deeply — no direct quotes
• Use metadata to guide summary focus, tone, and order — do not invent structure
• Ensure smooth transitions between sections and avoid isolated blocks

You are generating the ${isFirstHalf ? 'first' : 'second'} half of a complete longform summary. The half summary will be approximately 22,000–25,000 characters across 4-5 chapters.

In this half, include only 4–5 chapters, adjusted to match the same level of depth, detail, and character count as you would in a full-length summary. Do not shorten content — only reduce the number of chapters. The tone, structure, and pacing must remain consistent.

Wait for or build upon the other half accordingly.
`.trim();
}

module.exports = {
  generateUserPrompt,
}