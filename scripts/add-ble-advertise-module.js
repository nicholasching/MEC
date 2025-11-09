/**
 * Script to manually add the BLE Advertise module to Android project
 * This should be run after `npx expo prebuild`
 */

const fs = require('fs');
const path = require('path');

const androidProjectPath = path.join(__dirname, '..', 'android');
const appBuildGradlePath = path.join(androidProjectPath, 'app', 'build.gradle');
const settingsGradlePath = path.join(androidProjectPath, 'settings.gradle');
const mainApplicationPath = path.join(androidProjectPath, 'app', 'src', 'main', 'java', 'com', 'blerelay', 'MainApplication.kt');

console.log('Adding BLE Advertise module to Android project...');

// Check if android directory exists
if (!fs.existsSync(androidProjectPath)) {
  console.error('Android project not found. Please run "npx expo prebuild" first.');
  process.exit(1);
}

// Read and update settings.gradle
if (fs.existsSync(settingsGradlePath)) {
  let settingsContent = fs.readFileSync(settingsGradlePath, 'utf8');
  
  if (!settingsContent.includes('ble-advertise')) {
    // Add include for the module
    const includePattern = /include\s*\([\s\S]*?\)/;
    if (includePattern.test(settingsContent)) {
      settingsContent = settingsContent.replace(
        /(include\s*\([^)]*)/,
        `$1\n        ':ble-advertise'`
      );
    } else {
      settingsContent += "\ninclude ':ble-advertise'\n";
    }

    // Add project dependency
    if (!settingsContent.includes("project(':ble-advertise')")) {
      settingsContent += `
project(':ble-advertise').projectDir = new File(rootProject.projectDir, '../modules/ble-advertise/android')
`;
    }

    fs.writeFileSync(settingsGradlePath, settingsContent);
    console.log('✓ Updated settings.gradle');
  }
}

// Read and update app/build.gradle
if (fs.existsSync(appBuildGradlePath)) {
  let buildGradleContent = fs.readFileSync(appBuildGradlePath, 'utf8');
  
  if (!buildGradleContent.includes('ble-advertise')) {
    // Add dependency
    const dependenciesPattern = /dependencies\s*\{([\s\S]*?)\n\}/;
    if (dependenciesPattern.test(buildGradleContent)) {
      buildGradleContent = buildGradleContent.replace(
        /(dependencies\s*\{)/,
        `$1\n    implementation project(':ble-advertise')`
      );
    }

    fs.writeFileSync(appBuildGradlePath, buildGradleContent);
    console.log('✓ Updated app/build.gradle');
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
    
    if (!mainApplicationContent.includes('BleAdvertisePackage')) {
      // Add import (handle both Kotlin and Java)
      const kotlinImport = 'import com.blerelay.BleAdvertisePackage';
      const javaImport = 'import com.blerelay.BleAdvertisePackage;';
      
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
              if (match.includes('BleAdvertisePackage')) {
                return match;
              }
              return `${p1}BleAdvertisePackage(),\n            ${p2}`;
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
              if (match.includes('BleAdvertisePackage')) {
                return match;
              }
              return `${p1}new BleAdvertisePackage(),\n            ${p2}`;
            }
          );
        }
      }

      fs.writeFileSync(mainAppPath, mainApplicationContent);
      console.log(`✓ Updated ${path.basename(mainAppPath)}`);
      mainApplicationFound = true;
      break;
    } else {
      console.log(`✓ ${path.basename(mainAppPath)} already has BleAdvertisePackage registered`);
      mainApplicationFound = true;
      break;
    }
  }
}

if (!mainApplicationFound) {
  console.log('⚠ MainApplication file not found. You need to manually register BleAdvertisePackage:');
  console.log('  1. Find your MainApplication.kt or MainApplication.java file');
  console.log('  2. Add: import com.blerelay.BleAdvertisePackage');
  console.log('  3. Add: BleAdvertisePackage() to the getPackages() list');
}

console.log('✓ BLE Advertise module integration complete!');
console.log('Next steps:');
console.log('1. Run "npx expo run:android" to build and run the app');
console.log('2. Make sure to grant Bluetooth permissions when prompted');

