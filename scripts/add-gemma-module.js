/**
 * Script to manually add the Gemma LLM module to Android project
 * This should be run after `npx expo prebuild`
 */

const fs = require('fs');
const path = require('path');

const androidProjectPath = path.join(__dirname, '..', 'android');
const appBuildGradlePath = path.join(androidProjectPath, 'app', 'build.gradle');
const settingsGradlePath = path.join(androidProjectPath, 'settings.gradle');
const mainApplicationPath = path.join(androidProjectPath, 'app', 'src', 'main', 'java', 'com', 'blerelay', 'MainApplication.kt');

console.log('Adding Gemma LLM module to Android project...');

// Check if android directory exists
if (!fs.existsSync(androidProjectPath)) {
  console.error('❌ Android project not found. Please run "npx expo prebuild" first.');
  process.exit(1);
}

// Read and update settings.gradle
if (fs.existsSync(settingsGradlePath)) {
  let settingsContent = fs.readFileSync(settingsGradlePath, 'utf8');
  
  if (!settingsContent.includes('gemma-llm')) {
    // Add include for the module
    const includePattern = /include\s*\([\s\S]*?\)/;
    if (includePattern.test(settingsContent)) {
      settingsContent = settingsContent.replace(
        /(include\s*\([^)]*)/,
        `$1\n        ':gemma-llm'`
      );
    } else {
      settingsContent += "\ninclude ':gemma-llm'\n";
    }

    // Add project dependency
    if (!settingsContent.includes("project(':gemma-llm')")) {
      settingsContent += `
project(':gemma-llm').projectDir = new File(rootProject.projectDir, '../modules/gemma-llm/android')
`;
    }

    fs.writeFileSync(settingsGradlePath, settingsContent);
    console.log('✓ Updated settings.gradle');
  } else {
    console.log('✓ settings.gradle already has gemma-llm module');
  }
}

// Read and update app/build.gradle
if (fs.existsSync(appBuildGradlePath)) {
  let buildGradleContent = fs.readFileSync(appBuildGradlePath, 'utf8');
  
  if (!buildGradleContent.includes('gemma-llm')) {
    // Add dependency
    const dependenciesPattern = /dependencies\s*\{([\s\S]*?)\n\}/;
    if (dependenciesPattern.test(buildGradleContent)) {
      buildGradleContent = buildGradleContent.replace(
        /(dependencies\s*\{)/,
        `$1\n    implementation project(':gemma-llm')`
      );
    }

    fs.writeFileSync(appBuildGradlePath, buildGradleContent);
    console.log('✓ Updated app/build.gradle');
  } else {
    console.log('✓ app/build.gradle already has gemma-llm dependency');
  }
}

// Update MainApplication to register the package
// Try to find MainApplication file (could be .kt or .java, and package name might vary)
const possibleMainApplicationPaths = [
  mainApplicationPath,
  mainApplicationPath.replace('.kt', '.java'),
  path.join(androidProjectPath, 'app', 'src', 'main', 'java', 'com', 'blerelay', 'MainApplication.java'),
  path.join(androidProjectPath, 'app', 'src', 'main', 'java', 'com', 'blerelay', 'MainApplication.kt'),
];

let mainApplicationFound = false;
for (const mainAppPath of possibleMainApplicationPaths) {
  if (fs.existsSync(mainAppPath)) {
    let mainApplicationContent = fs.readFileSync(mainAppPath, 'utf8');
    
    if (!mainApplicationContent.includes('GemmaPackage')) {
      // Add import (handle both Kotlin and Java)
      const kotlinImport = 'import com.blerelay.GemmaPackage';
      const javaImport = 'import com.blerelay.GemmaPackage;';
      
      if (mainAppPath.endsWith('.kt')) {
        if (!mainApplicationContent.includes(kotlinImport)) {
          // Add after last import
          const importLines = mainApplicationContent.match(/^import\s+.*$/gm);
          if (importLines && importLines.length > 0) {
            const lastImport = importLines[importLines.length - 1];
            mainApplicationContent = mainApplicationContent.replace(
              lastImport,
              `${lastImport}\n${kotlinImport}`
            );
          }
        }
        
        // Add to packages list (Kotlin)
        const packagesPattern = /(override\s+fun\s+getPackages\(\)[\s\S]*?(?:return\s+)?listOf\s*\([\s\S]*?)(\))/;
        if (packagesPattern.test(mainApplicationContent)) {
          mainApplicationContent = mainApplicationContent.replace(
            packagesPattern,
            (match, p1, p2) => {
              // Check if it's already there
              if (match.includes('GemmaPackage')) {
                return match;
              }
              return `${p1}GemmaPackage(),\n            ${p2}`;
            }
          );
        }
      } else if (mainAppPath.endsWith('.java')) {
        if (!mainApplicationContent.includes(javaImport)) {
          // Add after package declaration
          const packageMatch = mainApplicationContent.match(/^package\s+[^;]+;/m);
          if (packageMatch) {
            mainApplicationContent = mainApplicationContent.replace(
              packageMatch[0],
              `${packageMatch[0]}\n\n${javaImport}`
            );
          }
        }
        
        // Add to packages list (Java)
        const packagesPattern = /(@Override\s+protected\s+List<ReactPackage>\s+getPackages\(\)[\s\S]*?return\s+Arrays\.asList\([\s\S]*?)(\))/;
        if (packagesPattern.test(mainApplicationContent)) {
          mainApplicationContent = mainApplicationContent.replace(
            packagesPattern,
            (match, p1, p2) => {
              if (match.includes('GemmaPackage')) {
                return match;
              }
              return `${p1}new GemmaPackage(),\n            ${p2}`;
            }
          );
        }
      }

      fs.writeFileSync(mainAppPath, mainApplicationContent);
      console.log(`✓ Updated ${path.basename(mainAppPath)}`);
      mainApplicationFound = true;
      break;
    } else {
      console.log(`✓ ${path.basename(mainAppPath)} already has GemmaPackage registered`);
      mainApplicationFound = true;
      break;
    }
  }
}

if (!mainApplicationFound) {
  console.log('⚠ MainApplication file not found. You need to manually register GemmaPackage:');
  console.log('  1. Find your MainApplication.kt or MainApplication.java file');
  console.log('  2. Add: import com.blerelay.GemmaPackage');
  console.log('  3. Add: GemmaPackage() to the getPackages() list');
}

console.log('\n✅ Gemma LLM module integration complete!');
console.log('\nNext steps:');
console.log('1. Run "npx expo run:android" to build and run the app');
console.log('2. Download the Gemma model from HuggingFace');
console.log('3. Import the model in the app\'s AI Chat tab');
console.log('\nModel download link:');
console.log('https://huggingface.co/google/gemma-3n-E4B-it-litert-lm');

