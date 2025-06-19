import fs from 'fs';
import path from 'path';

/**
 * Intelligent voice selection system for audiobook generation
 * Analyzes book metadata to select optimal voice and SSML configuration
 */
export class VoiceSelector {
  constructor() {
    // Voice characteristics based on user's classification
    this.voices = {
      // Female Voices
      alloy: {
        gender: 'female',
        tone: 'warm',
        style: 'grounded',
        personality: 'conversational',
        bestFor: ['self-help', 'personal-development', 'wellness', 'general-audience']
      },
      coral: {
        gender: 'female',
        tone: 'bright',
        style: 'young',
        personality: 'emotional',
        bestFor: ['motivational', 'lifestyle', 'youth-oriented', 'inspirational']
      },
      echo: {
        gender: 'female',
        tone: 'soft',
        style: 'calm',
        personality: 'gentle',
        bestFor: ['mindfulness', 'wellness', 'spiritual', 'meditation', 'healing']
      },
      fable: {
        gender: 'female',
        tone: 'playful',
        style: 'storybook',
        personality: 'creative',
        bestFor: ['narrative', 'creative', 'storytelling', 'fiction-like']
      },
      nova: {
        gender: 'female',
        tone: 'friendly',
        style: 'expressive',
        personality: 'approachable',
        bestFor: ['general-audience', 'accessible', 'educational', 'popular']
      },
      shimmer: {
        gender: 'female',
        tone: 'clear',
        style: 'futuristic',
        personality: 'smooth',
        bestFor: ['technology', 'innovation', 'modern-business', 'science']
      },
      
      // Male Voices
      ash: {
        gender: 'male',
        tone: 'crisp',
        style: 'confident',
        personality: 'articulate',
        bestFor: ['business', 'leadership', 'professional', 'corporate', 'finance']
      },
      onyx: {
        gender: 'male',
        tone: 'deep',
        style: 'serious',
        personality: 'cinematic',
        bestFor: ['authoritative', 'biography', 'history', 'heavy-topics', 'dramatic']
      },
      sage: {
        gender: 'male',
        tone: 'mature',
        style: 'wise',
        personality: 'experienced',
        bestFor: ['philosophy', 'wisdom', 'academic', 'intellectual', 'mentorship']
      }
    };

    // Genre to voice category mapping
    this.genreMapping = {
      'personal finance': ['business', 'professional'],
      'self-help': ['self-help', 'personal-development'],
      'entrepreneurship': ['business', 'leadership'],
      'business': ['business', 'professional', 'corporate'],
      'leadership': ['leadership', 'professional'],
      'motivation': ['motivational', 'inspirational'],
      'wellness': ['wellness', 'mindfulness'],
      'spirituality': ['spiritual', 'wellness'],
      'technology': ['technology', 'innovation'],
      'science': ['science', 'technology'],
      'philosophy': ['philosophy', 'intellectual'],
      'biography': ['biography', 'narrative'],
      'history': ['history', 'authoritative'],
      'psychology': ['academic', 'professional'],
      'health': ['wellness', 'healing'],
      'fitness': ['motivational', 'wellness'],
      'relationships': ['self-help', 'personal-development'],
      'parenting': ['general-audience', 'accessible'],
      'education': ['educational', 'accessible'],
      'creativity': ['creative', 'inspirational'],
      'memoir': ['narrative', 'storytelling']
    };
  }

  /**
   * Select optimal voice for a book based on metadata
   * @param {string} bookId - Book identifier
   * @param {string} metadataPath - Path to book metadata directory
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoiceForBook(bookId, metadataPath = 'Meta of All Books DB') {
    try {
      // Load book metadata
      const metadata = await this.loadBookMetadata(bookId, metadataPath);
      
      if (!metadata) {
        console.warn(`⚠️  No metadata found for book ${bookId}, using default voice`);
        return this.getDefaultVoiceConfig();
      }

      // Analyze metadata and select voice
      const analysis = this.analyzeBookCharacteristics(metadata);
      const selectedVoice = this.selectOptimalVoice(analysis);
      const ssmlConfig = this.generateSSMLConfig(selectedVoice, analysis);

      const result = {
        bookId,
        selectedVoice: selectedVoice.name,
        voiceCharacteristics: selectedVoice.characteristics,
        analysis,
        ssmlConfig,
        confidence: selectedVoice.confidence,
        reasoning: selectedVoice.reasoning
      };

      console.log(`🎤 Voice selected for "${metadata.title}": ${selectedVoice.name} (${selectedVoice.confidence}% confidence)`);
      console.log(`📝 Reasoning: ${selectedVoice.reasoning}`);

      return result;

    } catch (error) {
      console.error(`❌ Voice selection failed for book ${bookId}:`, error);
      return this.getDefaultVoiceConfig(bookId);
    }
  }

  /**
   * Load book metadata from JSON file
   * @param {string} bookId - Book identifier
   * @param {string} metadataPath - Path to metadata directory
   * @returns {Promise<Object>} Book metadata
   */
  async loadBookMetadata(bookId, metadataPath) {
    try {
      const metadataFile = path.join(metadataPath, `${bookId}.json`);
      
      if (!fs.existsSync(metadataFile)) {
        return null;
      }

      const rawData = fs.readFileSync(metadataFile, 'utf8');
      const metadata = JSON.parse(rawData);
      
      // Handle array format (some metadata files contain arrays)
      return Array.isArray(metadata) ? metadata[0] : metadata;

    } catch (error) {
      console.error(`Failed to load metadata for book ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Analyze book characteristics for voice selection
   * @param {Object} metadata - Book metadata
   * @returns {Object} Analysis result
   */
  analyzeBookCharacteristics(metadata) {
    const analysis = {
      authorGender: this.inferAuthorGender(metadata.author),
      genres: this.normalizeGenres(metadata.genre || []),
      themes: metadata.core_themes || [],
      targetAudience: metadata.target_audience || [],
      tone: this.inferBookTone(metadata),
      authorityLevel: this.inferAuthorityLevel(metadata),
      contentStyle: this.inferContentStyle(metadata)
    };

    return analysis;
  }

  /**
   * Infer author gender from name (basic heuristic)
   * @param {string} authorName - Author name
   * @returns {string} Inferred gender or 'unknown'
   */
  inferAuthorGender(authorName) {
    if (!authorName) return 'unknown';

    // Common male name patterns
    const malePatterns = [
      /\bRobert\b/i, /\bJohn\b/i, /\bMichael\b/i, /\bDavid\b/i, /\bJames\b/i,
      /\bWilliam\b/i, /\bRichard\b/i, /\bCharles\b/i, /\bThomas\b/i, /\bDaniel\b/i,
      /\bMatthew\b/i, /\bAnthony\b/i, /\bMark\b/i, /\bDonald\b/i, /\bSteven\b/i,
      /\bPaul\b/i, /\bAndrew\b/i, /\bJoshua\b/i, /\bKenneth\b/i, /\bKevin\b/i,
      /\bBrian\b/i, /\bGeorge\b/i, /\bTimothy\b/i, /\bRonald\b/i, /\bJason\b/i,
      /\bEdward\b/i, /\bJeffrey\b/i, /\bRyan\b/i, /\bJacob\b/i, /\bGary\b/i,
      /\bNicholas\b/i, /\bEric\b/i, /\bJonathan\b/i, /\bStephen\b/i, /\bLarry\b/i,
      /\bJustin\b/i, /\bScott\b/i, /\bBrandon\b/i, /\bBenjamin\b/i, /\bSamuel\b/i,
      /\bFrank\b/i, /\bGregory\b/i, /\bRaymond\b/i, /\bAlexander\b/i, /\bPatrick\b/i,
      /\bJack\b/i, /\bDennis\b/i, /\bJerry\b/i, /\bTyler\b/i, /\bAaron\b/i,
      /\bJose\b/i, /\bHenry\b/i, /\bAdam\b/i, /\bDouglas\b/i, /\bNathan\b/i,
      /\bPeter\b/i, /\bZachary\b/i, /\bKyle\b/i, /\bNoah\b/i, /\bAlan\b/i,
      /\bEthan\b/i, /\bJeremy\b/i, /\bLionel\b/i, /\bWayne\b/i, /\bBruce\b/i
    ];

    // Common female name patterns
    const femalePatterns = [
      /\bMary\b/i, /\bPatricia\b/i, /\bJennifer\b/i, /\bLinda\b/i, /\bElizabeth\b/i,
      /\bBarbara\b/i, /\bSusan\b/i, /\bJessica\b/i, /\bSarah\b/i, /\bKaren\b/i,
      /\bNancy\b/i, /\bLisa\b/i, /\bBetty\b/i, /\bHelen\b/i, /\bSandra\b/i,
      /\bDonna\b/i, /\bCarol\b/i, /\bRuth\b/i, /\bSharon\b/i, /\bMichelle\b/i,
      /\bLaura\b/i, /\bSarah\b/i, /\bKimberly\b/i, /\bDeborah\b/i, /\bDorothy\b/i,
      /\bAmy\b/i, /\bAngela\b/i, /\bAshley\b/i, /\bBrenda\b/i, /\bEmma\b/i,
      /\bOlivia\b/i, /\bCynthia\b/i, /\bMarie\b/i, /\bJanet\b/i, /\bCatherine\b/i,
      /\bFrances\b/i, /\bChristine\b/i, /\bSamantha\b/i, /\bDebra\b/i, /\bRachel\b/i,
      /\bCarolyn\b/i, /\bJanet\b/i, /\bVirginia\b/i, /\bMaria\b/i, /\bHeather\b/i,
      /\bDiane\b/i, /\bJulie\b/i, /\bJoyce\b/i, /\bVictoria\b/i, /\bKelly\b/i,
      /\bChristina\b/i, /\bJoan\b/i, /\bEvelyn\b/i, /\bLauren\b/i, /\bJudith\b/i,
      /\bMegan\b/i, /\bCheryl\b/i, /\bAndrea\b/i, /\bHannah\b/i, /\bJacqueline\b/i,
      /\bMartha\b/i, /\bGloria\b/i, /\bSara\b/i, /\bJanice\b/i, /\bKathryn\b/i,
      /\bAnne\b/i, /\bKathy\b/i, /\bAlice\b/i, /\bTeresa\b/i, /\bOprah\b/i,
      /\bBrenė\b/i, /\bMarie\b/i, /\bSheryl\b/i, /\bMelinda\b/i, /\bArianna\b/i
    ];

    // Check for male patterns
    for (const pattern of malePatterns) {
      if (pattern.test(authorName)) {
        return 'male';
      }
    }

    // Check for female patterns
    for (const femalePatterns of femalePatterns) {
      if (femalePatterns.test(authorName)) {
        return 'female';
      }
    }

    return 'unknown';
  }

  /**
   * Normalize genre names for consistent matching
   * @param {Array} genres - Array of genre strings
   * @returns {Array} Normalized genres
   */
  normalizeGenres(genres) {
    if (!Array.isArray(genres)) return [];
    
    return genres.map(genre => 
      genre.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
    );
  }

  /**
   * Infer book tone from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Inferred tone
   */
  inferBookTone(metadata) {
    const title = (metadata.title || '').toLowerCase();
    const themes = (metadata.core_themes || []).join(' ').toLowerCase();
    const purpose = (metadata.primary_purpose || '').toLowerCase();

    if (title.includes('rich') || title.includes('wealth') || title.includes('money')) {
      return 'authoritative';
    }
    
    if (themes.includes('motivational') || themes.includes('inspirational')) {
      return 'inspiring';
    }
    
    if (themes.includes('gentle') || themes.includes('mindful') || themes.includes('wellness')) {
      return 'gentle';
    }
    
    if (purpose.includes('challenge') || purpose.includes('transform')) {
      return 'confident';
    }

    return 'balanced';
  }

  /**
   * Infer authority level from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Authority level
   */
  inferAuthorityLevel(metadata) {
    const reception = (metadata.reception_impact || []).join(' ').toLowerCase();
    const genres = this.normalizeGenres(metadata.genre || []);
    
    if (reception.includes('bestseller') || reception.includes('million copies')) {
      return 'high';
    }
    
    if (genres.some(g => ['business', 'leadership', 'finance'].includes(g))) {
      return 'high';
    }
    
    if (genres.some(g => ['self-help', 'personal development'].includes(g))) {
      return 'medium';
    }

    return 'medium';
  }

  /**
   * Infer content style from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Content style
   */
  inferContentStyle(metadata) {
    const style = (metadata.style_tone || []).join(' ').toLowerCase();
    const structure = metadata.structure_format || {};
    const narrativeStyle = (structure.narrative_style || '').toLowerCase();

    if (narrativeStyle.includes('story') || narrativeStyle.includes('anecdotal')) {
      return 'narrative';
    }
    
    if (style.includes('conversational')) {
      return 'conversational';
    }
    
    if (style.includes('straightforward') || style.includes('direct')) {
      return 'direct';
    }

    return 'balanced';
  }

  /**
   * Select optimal voice based on analysis
   * @param {Object} analysis - Book analysis
   * @returns {Object} Selected voice with confidence and reasoning
   */
  selectOptimalVoice(analysis) {
    const candidates = [];

    // Score each voice based on analysis
    for (const [voiceName, voiceData] of Object.entries(this.voices)) {
      const score = this.calculateVoiceScore(voiceData, analysis);
      candidates.push({
        name: voiceName,
        characteristics: voiceData,
        score: score.total,
        reasoning: score.reasoning
      });
    }

    // Sort by score and select the best match
    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates[0];

    return {
      name: selected.name,
      characteristics: selected.characteristics,
      confidence: Math.min(95, Math.max(60, selected.score)),
      reasoning: selected.reasoning
    };
  }

  /**
   * Calculate voice score based on analysis
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} analysis - Book analysis
   * @returns {Object} Score and reasoning
   */
  calculateVoiceScore(voiceData, analysis) {
    let score = 0;
    const reasons = [];

    // Gender matching (if known)
    if (analysis.authorGender !== 'unknown') {
      if (voiceData.gender === analysis.authorGender) {
        score += 30;
        reasons.push(`Matches author gender (${analysis.authorGender})`);
      } else {
        score -= 10;
      }
    }

    // Genre matching
    const genreMatches = this.findGenreMatches(analysis.genres, voiceData.bestFor);
    if (genreMatches.length > 0) {
      score += genreMatches.length * 15;
      reasons.push(`Strong genre match: ${genreMatches.join(', ')}`);
    }

    // Authority level matching
    if (analysis.authorityLevel === 'high') {
      if (['ash', 'onyx', 'sage'].includes(voiceData.gender === 'male' ? 'match' : 'no')) {
        score += 10;
        reasons.push('Authoritative voice for high-authority content');
      }
    }

    // Content style matching
    if (analysis.contentStyle === 'conversational' && voiceData.personality === 'conversational') {
      score += 15;
      reasons.push('Conversational style match');
    }

    // Tone matching
    if (analysis.tone === 'authoritative' && ['ash', 'onyx'].includes(voiceData.tone)) {
      score += 10;
      reasons.push('Authoritative tone match');
    }

    return {
      total: score,
      reasoning: reasons.join('; ') || 'General compatibility'
    };
  }

  /**
   * Find matching genres between book and voice
   * @param {Array} bookGenres - Book genres
   * @param {Array} voiceBestFor - Voice best-for categories
   * @returns {Array} Matching categories
   */
  findGenreMatches(bookGenres, voiceBestFor) {
    const matches = [];
    
    for (const genre of bookGenres) {
      const mappedCategories = this.genreMapping[genre] || [];
      for (const category of mappedCategories) {
        if (voiceBestFor.includes(category)) {
          matches.push(category);
        }
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Generate SSML configuration for selected voice
   * @param {Object} selectedVoice - Selected voice data
   * @param {Object} analysis - Book analysis
   * @returns {Object} SSML configuration
   */
  generateSSMLConfig(selectedVoice, analysis) {
    const config = {
      voice: selectedVoice.name,
      baseSettings: {
        rate: this.getOptimalRate(selectedVoice, analysis),
        pitch: this.getOptimalPitch(selectedVoice, analysis)
      },
      sectionSettings: {
        introduction: this.getIntroductionSettings(selectedVoice, analysis),
        chapter: this.getChapterSettings(selectedVoice, analysis),
        conclusion: this.getConclusionSettings(selectedVoice, analysis)
      },
      emphasisSettings: {
        keyTerms: this.getKeyTermsSettings(selectedVoice, analysis),
        quotes: this.getQuotesSettings(selectedVoice, analysis)
      }
    };

    return config;
  }

  /**
   * Get optimal speech rate for voice and content
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {string} Rate setting
   */
  getOptimalRate(selectedVoice, analysis) {
    // Adjust rate based on content complexity and voice characteristics
    if (analysis.contentStyle === 'narrative') return '1.0';
    if (selectedVoice.characteristics.tone === 'deep') return '0.95';
    if (selectedVoice.characteristics.style === 'young') return '1.05';
    return '1.0';
  }

  /**
   * Get optimal pitch for voice and content
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {string} Pitch setting
   */
  getOptimalPitch(selectedVoice, analysis) {
    // Most voices work best at medium pitch
    return 'medium';
  }

  /**
   * Get introduction-specific SSML settings
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {Object} Introduction settings
   */
  getIntroductionSettings(selectedVoice, analysis) {
    return {
      rate: '0.95', // Slightly slower for introduction
      emphasis: 'moderate',
      pauseAfter: '1.5s'
    };
  }

  /**
   * Get chapter-specific SSML settings
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {Object} Chapter settings
   */
  getChapterSettings(selectedVoice, analysis) {
    return {
      rate: '1.0',
      emphasis: 'moderate',
      pauseAfter: '1.0s'
    };
  }

  /**
   * Get conclusion-specific SSML settings
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {Object} Conclusion settings
   */
  getConclusionSettings(selectedVoice, analysis) {
    return {
      rate: '0.98', // Slightly slower for emphasis
      emphasis: 'strong',
      pauseAfter: '2.0s'
    };
  }

  /**
   * Get key terms emphasis settings
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {Object} Key terms settings
   */
  getKeyTermsSettings(selectedVoice, analysis) {
    return {
      level: 'moderate',
      pauseAfter: '0.3s'
    };
  }

  /**
   * Get quotes emphasis settings
   * @param {Object} selectedVoice - Selected voice
   * @param {Object} analysis - Book analysis
   * @returns {Object} Quotes settings
   */
  getQuotesSettings(selectedVoice, analysis) {
    return {
      rate: '0.98',
      emphasis: 'moderate'
    };
  }

  /**
   * Get default voice configuration
   * @param {string} bookId - Book identifier
   * @returns {Object} Default configuration
   */
  getDefaultVoiceConfig(bookId = 'unknown') {
    return {
      bookId,
      selectedVoice: 'nova',
      voiceCharacteristics: this.voices.nova,
      analysis: {
        authorGender: 'unknown',
        genres: [],
        themes: [],
        targetAudience: [],
        tone: 'balanced',
        authorityLevel: 'medium',
        contentStyle: 'balanced'
      },
      ssmlConfig: {
        voice: 'nova',
        baseSettings: { rate: '1.0', pitch: 'medium' },
        sectionSettings: {
          introduction: { rate: '0.95', emphasis: 'moderate', pauseAfter: '1.5s' },
          chapter: { rate: '1.0', emphasis: 'moderate', pauseAfter: '1.0s' },
          conclusion: { rate: '0.98', emphasis: 'strong', pauseAfter: '2.0s' }
        },
        emphasisSettings: {
          keyTerms: { level: 'moderate', pauseAfter: '0.3s' },
          quotes: { rate: '0.98', emphasis: 'moderate' }
        }
      },
      confidence: 70,
      reasoning: 'Default voice selection (no metadata available)'
    };
  }

  /**
   * Batch select voices for multiple books
   * @param {Array} bookIds - Array of book identifiers
   * @param {string} metadataPath - Path to metadata directory
   * @returns {Promise<Object>} Batch selection results
   */
  async batchSelectVoices(bookIds, metadataPath = 'Meta of All Books DB') {
    const results = {};
    const errors = [];

    console.log(`🎤 Selecting voices for ${bookIds.length} books...`);

    for (const bookId of bookIds) {
      try {
        results[bookId] = await this.selectVoiceForBook(bookId, metadataPath);
      } catch (error) {
        console.error(`Voice selection failed for book ${bookId}:`, error);
        errors.push({ bookId, error: error.message });
        results[bookId] = this.getDefaultVoiceConfig(bookId);
      }
    }

    return {
      results,
      errors,
      summary: {
        total: bookIds.length,
        successful: Object.keys(results).length - errors.length,
        failed: errors.length
      }
    };
  }
}

export default VoiceSelector;
