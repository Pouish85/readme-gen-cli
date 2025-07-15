import * as fs from "fs/promises";
import * as path from "path";
import { ReadmeData } from "../data";

/**
 * Read the package.json file from the current directory and extract relevant information.
 * @returns {Promise<Partial<ReadmeData>>}
 */
export async function getPackageJsonData(): Promise<Partial<ReadmeData>> {
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
