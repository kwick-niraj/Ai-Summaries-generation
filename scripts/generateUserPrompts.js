function generateUserPrompt(meta, summaryToneAndStructure, isFirstHalf = true) {
  const {
    Title,
    Author,
    PublicationDate,
    Genre = [],
    TargetAudience = [],
    "Core Themes": CoreThemes = [],
    "Key Concepts / Lessons": KeyConcepts = [],
    "Primary Purpose": PrimaryPurpose = '',
    "Structure & Format": StructureFormat = {},
    "Style & Tone": StyleTone = [],
    "Notable Features": NotableFeatures = []
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

  const tone = `${toneAndStructure.structure_type}, tactical_breakdown, ${metaTone}`


  // 🧱 Bullet rules
  const bulletRule = "sparingly for summarizing grouped tools, techniques, or insights — not for every section";

  // 🧱 Summary Strategy (flexible, genre-agnostic)
  // const summaryStrategy = `Summary Type: ${toneAndStructure.structure_type}.\nDescription: ${toneAndStructure.description} ${toneAndStructure.structure}`;

  const summaryStrategy = `Structure Type: Mixed (story_wisdom 70% + tactical_breakdown 30%)
Description:
Use the following structure configuration to guide the summary writing process. Apply each style proportionally based on its weight and purpose, blending them seamlessly throughout the chapters.

• 70% of the summary should follow the **“story_wisdom”** structure — deliver key ideas through emotionally engaging, reflective storytelling. Use broad, relatable scenarios to illustrate insights, and include paraphrased examples or everyday situations. You may use generalized archetypes (e.g., “a manager,” “a shy student”), but avoid named characters or fictional backstories. Keep the tone warm, natural, and human — like a guided reflection.

• 30% of the summary should follow the **“tactical_breakdown”** structure — embed practical takeaways or techniques derived from the concepts. Where appropriate, use brief bullet points to present grouped tools or actionable tips. Maintain a clear, helpful tone, and ensure these tactics support the narrative flow without disrupting it.

Avoid dividing the two styles into separate sections. Instead, let storytelling lead, and let tactical clarity appear organically when reinforcing a key idea. The final output should feel cohesive, clear, and human in both form and tone.
`

  // 🧱 Avoid list (dynamic + generic)
  const avoid = [
    "Second-person language (e.g., 'you', 'your')",
    `Mentioning the author directly (e.g., '${Author} says...', '${Author} believes...')`,
    "Overuse of bullet points or generic list formatting",
    "Reusing original chapter titles or structure from the book",
    "Copying or closely imitating the book’s own phrasing or section names"
  ];


  return `
You are a professional nonfiction book summarizer.

Your job is to generate a flowing, clear, deeply paraphrased summary of the following nonfiction book using the metadata and the formatting rules provided.

⸻

📘 Book Metadata:
• Title: ${Title}
• Author: ${Author}
• Genre: ${Genre.join(', ')}
• First Published: ${PublicationDate}
• Target Audience: ${TargetAudience.join(', ')}

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
• Tone: ${tone}
• Voice: third-person only
• Style: conversational, simple, and practical
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