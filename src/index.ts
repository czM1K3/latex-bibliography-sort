import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { EOL } from "os";

const args = process.argv;
if (args.length < 3) {
	throw new Error("Not enough arguments");
}
const filePathArg = args[2];
const basePath = path.dirname(filePathArg);

const includeOrInputRegex = /\\(input|include)\{(.*)\}/gm;
const citationRegex = /\\cite\{([a-zA-Z-_]*)}/gm;
const includesBibliographyRegex =
	/\\begin{thebibliography\}.*\\end\{thebibliography}/gms;
const bibitemRegex = /.*\\bibitem\{([a-zA-Z-_]*)\}.*(\r|\n)/gm;
const bibliographyEndRegex = /\\end\{thebibliography}/gm;

const citationsArray: string[] = [];

let literatureFilePath: string | null = null;

const parseFile = (filePath: string) => {
	const fileContent = readFileSync(filePath, "utf8");

	// Go through every line on the file
	fileContent.split(EOL).forEach((line) => {
		// Check if the line contains an include or input command
		// If so, recursively parse the included file
		const includeOrInput = includeOrInputRegex.exec(line);
		if (includeOrInput) {
			const filePath = includeOrInput[2];
			// If the path doesn't include extension, add .tex
			const filePathWithExtension = `${filePath}${
				filePath.endsWith(".tex") ? "" : ".tex"
			}`;
			parseFile(`${basePath}/${filePathWithExtension}`);
			return;
		}
		// Get all citations on the current line
		const citations = line.matchAll(citationRegex);
		for (const citation of citations) {
			// If the citation is not already in the array, add it
			if (!citationsArray.includes(citation[1])) {
				citationsArray.push(citation[1]);
			}
		}
	});
	// Check if the file contains a bibliography
	if (includesBibliographyRegex.test(fileContent)) {
		literatureFilePath = filePath;
	}
};
parseFile(filePathArg);

if (!literatureFilePath) {
	console.log("No literature file found");
	console.log("Citations:", citationsArray);
} else {
	const literatureFileContent = readFileSync(literatureFilePath, "utf8");
	const rawBibItems = literatureFileContent.matchAll(bibitemRegex);
	const bibItemsArray = Array.from(rawBibItems, (item) => ({
		fullLine: item[0],
		key: item[1],
	}));
	const sortedBibItems = bibItemsArray.sort((a, b) => {
		return citationsArray.indexOf(a.key) - citationsArray.indexOf(b.key);
	});
	const newFileContent = literatureFileContent
		.replaceAll(bibitemRegex, "")
		.replace(
			bibliographyEndRegex,
			`${sortedBibItems.map((item) => item.fullLine).join("")}\\end{thebibliography}`
		);
	writeFileSync(literatureFilePath, newFileContent, { encoding: "utf8", flag: "w" });
}
