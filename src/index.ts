#!/usr/bin/env node

import {Command} from "commander";
import * as fs from "fs/promises";
import * as fsp from "fs/promises";
import Handlebars from "handlebars";
import * as path from "path";
import prompts from "prompts";
import {defaultReadmeData, ReadmeData} from "./data";

const program = new Command();

/**
 * Read the package.json file from the current directory and extract relevant information.
 * @returns {Promise<Partial<ReadmeData>>}
 */
async function getPackageJsonData(): Promise<Partial<ReadmeData>> {
	const packageJsonPath = path.join(process.cwd(), "package.json");
	try {
		const fileContent = await fs.readFile(packageJsonPath, { encoding: "utf-8" });
		const packageJson = JSON.parse(fileContent);

		let projectName = packageJson.name || "";
		let description = packageJson.description || "";
		let version = packageJson.version || "1.0.0";
		let author = "";
		let githubUsername = "";
		let repositoryName = projectName;
		let license = packageJson.license || "MIT";

		if (typeof packageJson.author === "string") {
			author = packageJson.author.split("<")[0].trim();
			if (author && !author.includes(" ") && !author.includes("/")) {
				githubUsername = author;
			}
		} else if (packageJson.author?.name) {
			author = packageJson.author.name;
			if (author && !author.includes(" ") && !author.includes("/")) {
				githubUsername = author;
			}
		}

		const repoUrl = packageJson.repository?.url || packageJson.homepage || "";
		if (repoUrl.includes("github.com")) {
			const parts = repoUrl.split("/");
			if (parts.length >= 5) {
				githubUsername = parts[3];
				repositoryName = parts[4].replace(".git", "");
			}
		} else if (repoUrl.includes("gitlab.com")) {
			const parts = repoUrl.split("/");
			if (parts.length >= 5) {
				githubUsername = parts[3];
				repositoryName = parts[4].replace(".git", "");
			}
		}

		if (!author && githubUsername) {
			author = githubUsername;
		}

		return {
			projectName,
			description,
			version,
			author,
			license,
			githubUsername,
			repositoryName,
		};
	} catch (error) {
		console.warn(
			"⚠️ Could not read or parse package.json. Some information may need to be entered manually."
		);
		return {};
	}
}

/**
 * Generate the README.md content using Handlebars template engine.
 * @param {ReadmeData} data
 * @returns {Promise<string>}
 */
async function generateReadmeContent(data: ReadmeData): Promise<string> {
	const templatePath = path.join(__dirname, "..", "templates", "basic-readme.hbs");
	try {
		const templateContent = await fsp.readFile(templatePath, { encoding: "utf-8" });
		const template = Handlebars.compile(templateContent);
      return template(data);
	} catch (error) {
		console.error("❌ Error generating README content:", error);
		throw new Error("Failed to generate README content.");
	}
}

async function main() {
	// 1. Définir et parser les options CLI
	program
		.version("1.0.0") // Utilise la version de ton CLI
		.description("Generate a personalized README.md file.")
		.option("-p, --projectName <name>", "Project name")
		.option("-d, --description <text>", "Project description")
		// Correction ici : changement de l'option pour éviter le conflit avec la version de Commander
		.option("--projectVersion <version>", "Project version")
		.option("-a, --author <name>", "Author name")
		.option("-l, --license <type>", "Project license (e.g., MIT, ISC)")
		.option("-g, --githubUsername <username>", "GitHub username")
		.option("-r, --repositoryName <name>", "Repository name on GitHub")
		.option("-m, --mainLanguage <language>", "Main programming language")
		.option("--no-prompts", "Skip all interactive prompts and use default/provided values")
		.option("-f, --force", "Force overwrite existing README.md without confirmation");
	// Ajoute des options pour logo et preview
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

	program.parse(process.argv); // Analyse les arguments de ligne de commande
	const cliOptions = program.opts(); // Récupère les options parsées

	// 2. Initialiser finalData en fusionnant toutes les sources
	const packageData = await getPackageJsonData();

	let finalData: ReadmeData = {
		...defaultReadmeData, // La base
		...packageData, // Surchargée par package.json
		// Surcharge par les options CLI. Attention à bien mapper projectVersion vers version
		projectName:
			cliOptions.projectName || packageData.projectName || defaultReadmeData.projectName,
		description:
			cliOptions.description || packageData.description || defaultReadmeData.description,
		version: cliOptions.projectVersion || packageData.version || defaultReadmeData.version, // <-- Correction ici pour projectVersion
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

	// 3. Exécuter les prompts SEULEMENT si --no-prompts n'est PAS spécifié
	if (!cliOptions.noPrompts) {
		console.log(
			"We've extracted some information from your package.json. Please confirm or modify:\n"
		);

		// Définir TOUTES les questions possibles pour les prompts
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
				name: "version", // Le nom dans ReadmeData est 'version'
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

		// Filtrer les questions pour ne poser que celles dont la valeur n'a PAS été fournie via CLI
		const promptsToAsk = allPromptsQuestions.filter((q) => {
			// q.name peut être une chaîne de caractères ou un tableau de chaînes.
			// On s'assure que 'name' est bien une clé de ReadmeData pour l'accès à finalData
			const readmeDataKey = q.name as keyof ReadmeData;
			const cliOptionKey = q.name as keyof typeof cliOptions;

			// Cas spécial pour 'version' qui correspond à 'projectVersion' dans cliOptions
			if (readmeDataKey === "version" && cliOptions.projectVersion !== undefined) {
				console.log(`Project version: "${finalData.version}" (from CLI option)`);
				return false; // Ne pas poser la question
			}

			// Pour toutes les autres options, on vérifie si l'option CLI correspondante est définie
			if (cliOptions[cliOptionKey] !== undefined) {
				// Ici, nous devons être prudents car cliOptions[cliOptionKey] peut être une string ou un boolean.
				// finalData[readmeDataKey] est du bon type.
				console.log(`${q.message}: "${finalData[readmeDataKey]}" (from CLI option)`);
				return false; // Ne pas inclure cette question dans les prompts
			}
			return true; // Inclure cette question
		});

		// Exécuter les prompts uniquement pour les questions non ignorées
		const responses = await prompts(promptsToAsk);

		// Mettre à jour finalData avec les réponses des prompts
		finalData = { ...finalData, ...responses };

		// Prompts pour les Features (Boucle interactive)
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

	// 4. Générer le README
	console.log("\n--- Generating README.md... ---");

	const outputPath = path.join(process.cwd(), "README.md");
	// Vérifie si le fichier existe et demande confirmation si --force n'est pas utilisé
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

main();
