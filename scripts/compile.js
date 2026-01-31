const solc = require("solc");
const fs = require("fs");
const path = require("path");

const contractsDir = path.join(__dirname, "..", "contracts");
const artifactsDir = path.join(__dirname, "..", "artifacts");

// Create artifacts directory if it doesn't exist
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

function findImports(importPath) {
  try {
    let fullPath;
    if (importPath.startsWith("@openzeppelin/")) {
      fullPath = path.join(__dirname, "..", "node_modules", importPath);
    } else if (importPath.startsWith("./")) {
      fullPath = path.join(contractsDir, importPath.substring(2));
    } else {
      fullPath = path.join(contractsDir, importPath);
    }
    return { contents: fs.readFileSync(fullPath, "utf8") };
  } catch (e) {
    return { error: `File not found: ${importPath}` };
  }
}

// Read all contract files
const contractFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith(".sol"));

const sources = {};
for (const file of contractFiles) {
  const content = fs.readFileSync(path.join(contractsDir, file), "utf8");
  sources[file] = { content };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

console.log("🔨 Compiling contracts...\n");

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

// Check for errors
if (output.errors) {
  let hasError = false;
  output.errors.forEach(error => {
    console.log(error.formattedMessage);
    if (error.severity === "error") hasError = true;
  });
  if (hasError) {
    console.error("❌ Compilation failed with errors");
    process.exit(1);
  }
}

// Extract and save artifacts
let count = 0;
for (const [fileName, fileContracts] of Object.entries(output.contracts || {})) {
  for (const [contractName, contract] of Object.entries(fileContracts)) {
    const artifact = {
      contractName,
      abi: contract.abi,
      bytecode: "0x" + contract.evm.bytecode.object
    };
    
    const outputPath = path.join(artifactsDir, `${contractName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
    console.log(`✅ ${contractName} -> ${outputPath}`);
    count++;
  }
}

console.log(`\n✅ Compiled ${count} contracts successfully!`);
