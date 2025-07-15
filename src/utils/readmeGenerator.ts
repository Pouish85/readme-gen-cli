import * as fsp from "fs/promises";
import Handlebars from "handlebars";
import * as path from "path";
import { ReadmeData } from "../data";

/**
 * Generate the README.md content using Handlebars template engine.
 * @param {ReadmeData} data
 * @returns {Promise<string>}
 */
export async function generateReadmeContent(data: ReadmeData): Promise<string> {
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
