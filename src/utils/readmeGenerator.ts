import * as fs from "fs/promises";
import Handlebars from "handlebars";
import * as path from "path";
import { ReadmeData } from "../data";

/**
 * Generate the README.md content using Handlebars template engine.
 * @param {ReadmeData} data
 * @returns {Promise<string>}
 */
export async function generateReadmeContent(data: ReadmeData): Promise<string> {
	try {
		const templatePath = path.join(__dirname, "..", "templates", "basic-readme.hbs");

		const templateFile = await fs.readFile(templatePath, { encoding: "utf-8" });
		const template = Handlebars.compile(templateFile);
		return template(data);
	} catch (error) {
		console.error("❌ Erreur lors de la génération du contenu du README :", error);
		throw new Error("Échec de la génération du contenu du README.");
	}
}
