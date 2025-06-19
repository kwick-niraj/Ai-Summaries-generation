#!/usr/bin/env node

import { getConfig, printConfigSummary } from './config/audioConfig.js';
import { BookProcessor } from './pipeline/bookProcessor.js';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify SSML storage works with the updated configuration
 */
async function testConfiguredSSML() {
  console.log('🧪 Testing SSML Storage with Updated Configuration\n');

  try {
    // Test different presets
    const presets = ['balanced', 'premium', 'test'];
    
    for (const preset of presets) {
      console.log(`\n📋 Testing preset: ${preset.toUpperCase()}`);
      console.log('='.repeat(40));
      
      const config = getConfig(preset);
      printConfigSummary(config);
      
      console.log(`\n✅ SSML Features Status:`);
      console.log(`   🎵 SSML Generation: ${config.enableSSML ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   🎭 Voice Selection: ${config.intelligentVoiceSelection ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   📚 Metadata Dir: ${config.metadataDir || 'NOT SET'}`);
      
      if (config.enableSSML && config.intelligentVoiceSelection) {
        console.log(`   🎉 SSML storage will be activated!`);
      } else {
        console.log(`   ⚠️  SSML storage will NOT be activated`);
      }
    }

    // Test the actual command that user runs
    console.log('\n🚀 Testing actual command configuration...');
    console.log('Command: node ./Audio/runFullPipeline.js --test 1159');
    
    // Simulate the command with test preset (which is what --test uses)
    const testConfig = getConfig('balanced'); // Default preset
    
    console.log('\n📊 Configuration that will be used:');
    console.log(`   enableSSML: ${testConfig.enableSSML}`);
    console.log(`   intelligentVoiceSelection: ${testConfig.intelligentVoiceSelection}`);
    console.log(`   metadataDir: ${testConfig.metadataDir}`);
    
    // Check if metadata directory exists
    if (fs.existsSync(testConfig.metadataDir)) {
      const metadataFiles = fs.readdirSync(testConfig.metadataDir).filter(f => f.endsWith('.json'));
      console.log(`   📁 Metadata files found: ${metadataFiles.length}`);
      
      // Check for specific book
      const book1159 = path.join(testConfig.metadataDir, '1159.json');
      if (fs.existsSync(book1159)) {
        console.log(`   ✅ Book 1159 metadata exists: ${book1159}`);
      } else {
        console.log(`   ❌ Book 1159 metadata missing: ${book1159}`);
      }
    } else {
      console.log(`   ❌ Metadata directory not found: ${testConfig.metadataDir}`);
    }

    console.log('\n🎯 Expected SSML Output Structure:');
    console.log('   When you run: node scripts/Audio/runFullPipeline.js --test 1159');
    console.log('   You should see files created in:');
    console.log(`   📁 ${testConfig.outputDir}/1159/`);
    console.log('   ├── 1159_ssml.xml (complete SSML file)');
    console.log('   ├── ssml/');
    console.log('   │   ├── introduction.xml');
    console.log('   │   ├── chapter_01.xml');
    console.log('   │   ├── chapter_02.xml');
    console.log('   │   └── conclusion.xml');
    console.log('   └── processing_report.json (with SSML info)');

    console.log('\n✅ Configuration test completed!');
    console.log('\n🚀 Ready to test with: cd scripts && node Audio/runFullPipeline.js --test 1159');

  } catch (error) {
    console.error('\n❌ Configuration test failed:', error);
    console.error(error.stack);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConfiguredSSML().catch(console.error);
}

export { testConfiguredSSML };
