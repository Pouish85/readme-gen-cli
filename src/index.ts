#!/usr/bin/env node

import { Command } from "commander";
import * as fsp from "fs/promises";
import * as path from "path";
import prompts from "prompts";
import { defaultReadmeData, ReadmeData } from "./data";
import { getPackageJsonData } from "./utils/packageJson";
import { generateReadmeContent } from "./utils/readmeGenerator";

const program = new Command();
program.allowUnknownOption();
program.allowExcessArguments();

async function main() {
	program
		.version("1.0.0")
		.description("Generate a personalized README.md file.")
		.option("-p, --projectName <name>", "Project name")
		.option("-d, --description <text>", "Project description")
		.option("--projectVersion <version>", "Project version")
		.option("-a, --author <name>", "Author name")
		.option("-l, --license <type>", "Project license (e.g., MIT, ISC)")
		.option("-g, --githubUsername <username>", "GitHub username")
		.option("-r, --repositoryName <name>", "Repository name on GitHub")
		.option("-m, --mainLanguage <language>", "Main programming language")
		.option("--no-prompts", "Skip all interactive prompts and use default/provided values")
		.option("-f, --force", "Force overwrite existing README.md without confirmation");
	program
		.option(
			"--logo <boolean>",
			"Include a logo section (true/false)",
			(value) => value === "true"
		)
		.option(
			"--preview <boolean>",
			"Include a preview section (true/false)",
			(value) => value === "true"
		);

	program.parse(process.argv);
	const cliOptions = program.opts();

	const packageData = await getPackageJsonData();

	let finalData: ReadmeData = {
		...defaultReadmeData,
		...packageData,
		projectName:
			cliOptions.projectName || packageData.projectName || defaultReadmeData.projectName,
		description:
			cliOptions.description || packageData.description || defaultReadmeData.description,
		version: cliOptions.projectVersion || packageData.version || defaultReadmeData.version,
		author: cliOptions.author || packageData.author || defaultReadmeData.author,
		license: cliOptions.license || packageData.license || defaultReadmeData.license,
		githubUsername:
			cliOptions.githubUsername ||
			packageData.githubUsername ||
			defaultReadmeData.githubUsername,
		repositoryName:
			cliOptions.repositoryName ||
			packageData.repositoryName ||
			defaultReadmeData.repositoryName,
		mainLanguage:
			cliOptions.mainLanguage || packageData.mainLanguage || defaultReadmeData.mainLanguage,
		logo: typeof cliOptions.logo === "boolean" ? cliOptions.logo : defaultReadmeData.logo,
		preview:
			typeof cliOptions.preview === "boolean"
				? cliOptions.preview
				: defaultReadmeData.preview,
	};

	console.log("\n--- Let's generate your README.md! ---\n");

	if (!cliOptions.noPrompts) {
		console.log(
			"We've extracted some information from your package.json. Please confirm or modify:\n"
		);

		const allPromptsQuestions: prompts.PromptObject[] = [
			{
				type: "text",
				name: "projectName",
				message: "Project name",
				initial: finalData.projectName,
				validate: (value: string) => (value ? true : "Project name cannot be empty"),
			},
			{
				type: "text",
				name: "description",
				message: "Project description",
				initial: finalData.description,
			},
			{
				type: "text",
				name: "version",
				message: "Project version",
				initial: finalData.version,
			},
			{
				type: "text",
				name: "author",
				message: "Author name",
				initial: finalData.author,
			},
			{
				type: "text",
				name: "license",
				message: "Project license",
				initial: finalData.license,
			},
			{
				type: "text",
				name: "githubUsername",
				message: "GitHub username",
				initial: finalData.githubUsername,
			},
			{
				type: "text",
				name: "repositoryName",
				message: "Repository name (on GitHub)",
				initial: finalData.repositoryName,
			},
			{
				type: "text",
				name: "mainLanguage",
				message: "Main programming language",
				initial: finalData.mainLanguage,
			},
			{
				type: "select",
				name: "logo",
				message: "Would you like to include a logo in your README?",
				choices: [
					{ title: "Yes", value: true },
					{ title: "No", value: false },
				],
				initial: finalData.logo ? 0 : 1,
			},
			{
				type: "select",
				name: "preview",
				message: "Would you like to include a preview section in your README?",
				choices: [
					{ title: "Yes", value: true },
					{ title: "No", value: false },
				],
				initial: finalData.preview ? 0 : 1,
			},
		];

		const promptsToAsk = allPromptsQuestions.filter((q) => {
			const readmeDataKey = q.name as keyof ReadmeData;
			const cliOptionKey = q.name as keyof typeof cliOptions;

			if (readmeDataKey === "version" && cliOptions.projectVersion !== undefined) {
				console.log(`Project version: "${finalData.version}" (from CLI option)`);
				return false;
			}

			if (cliOptions[cliOptionKey] !== undefined) {
				console.log(`${q.message}: "${finalData[readmeDataKey]}" (from CLI option)`);
				return false;
			}
			return true;
		});

		const responses = await prompts(promptsToAsk);

		finalData = { ...finalData, ...responses };

		console.log("\n--- Features ---\n");
		finalData.features = finalData.features || [];
		let addMoreFeatures = true;
		while (addMoreFeatures) {
			const featurePrompt = await prompts([
				{
					type: "text",
					name: "name",
					message: "Enter feature name (leave empty to finish adding features):",
				},
				{
					type: "text",
					name: "text",
					message: "Enter feature description:",
				},
			]);

			if (featurePrompt.name) {
				finalData.features.push({
					name: featurePrompt.name,
					text: featurePrompt.text || "",
				});
				const anotherFeature = await prompts({
					type: "confirm",
					name: "confirm",
					message: "Add another feature?",
					initial: true,
				});
				addMoreFeatures = anotherFeature.confirm;
			} else {
				console.log("Skipping feature as name was empty.");
				addMoreFeatures = false;
			}
		}

		console.log("\n--- Technologies ---\n");
		finalData.technologies = finalData.technologies || [];
		let addMoreTechnologies = true;
		while (addMoreTechnologies) {
			const technologyPrompt = await prompts([
				{
					type: "text",
					name: "name",
					message: 'Enter technology name (e.g., "React"):',
				},
				{
					type: "text",
					name: "link",
					message: 'Enter technology link (e.g., "https://react.dev"):',
				},
			]);

			if (technologyPrompt.name) {
				finalData.technologies.push({
					name: technologyPrompt.name,
					link: technologyPrompt.link || "",
				});
				const anotherTechnology = await prompts({
					type: "confirm",
					name: "confirm",
					message: "Add another technology?",
					initial: true,
				});
				addMoreTechnologies = anotherTechnology.confirm;
			} else {
				console.log("Skipping technology as name was empty.");
				addMoreTechnologies = false;
			}
		}
	} else {
		console.log("Interactive prompts are skipped. Using provided/default values.");
	}

	console.log("\n--- Generating README.md... ---");

	const outputPath = path.join(process.cwd(), "README.md");
	if (
		(await fsp
			.access(outputPath)
			.then(() => true)
			.catch(() => false)) &&
		!cliOptions.force
	) {
		const overwriteConfirm = await prompts({
			type: "confirm",
			name: "overwrite",
			message: `A README.md already exists at "${outputPath}". Overwrite?`,
			initial: false,
		});
		if (!overwriteConfirm.overwrite) {
			console.log("Operation cancelled. README.md not overwritten.");
			return;
		}
	}

	try {
		const readmeContent = await generateReadmeContent(finalData);
		await fsp.writeFile(outputPath, readmeContent, { encoding: "utf-8" });
		console.log(`✅ README.md generated successfully at: ${outputPath}`);
	} catch (error) {
		console.error("❌ Failed to generate or write README.md:", error);
	}
}

if (require.main === module) {
	main();
}
