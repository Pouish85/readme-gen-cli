import * as fs from "fs/promises";
import { ReadmeData } from "../src/data";
import { generateReadmeContent } from "../src/utils/readmeGenerator";

jest.mock("fs/promises", () => ({
	readFile: jest.fn(),
}));

describe("generateReadmeContent", () => {
	const mockReadFile = fs.readFile as jest.Mock;

	const validData: ReadmeData = {
		projectName: "TestProject",
		description: "A test project",
		version: "1.0.0",
		author: "Jane Doe",
		license: "MIT",
		mainLanguage: "TypeScript",
		githubUsername: "janedoe",
		repositoryName: "testproject",
		features: [{ name: "Feature1", text: "Desc1" }],
		technologies: [{ name: "TypeScript", link: "https://www.typescriptlang.org/" }],
		preview: true,
		logo: false,
	};

	let consoleErrorSpy: jest.SpyInstance;

	beforeEach(() => {
		consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	test("shouldGenerateReadmeContentWithValidData", async () => {
		const template = `# {{projectName}}\n\n{{description}}\n\nVersion: {{version}}\nAuthor: {{author}}\nLicense: {{license}}\n`;
		mockReadFile.mockResolvedValueOnce(template);

		const content = await generateReadmeContent(validData);

		expect(content).toContain("# TestProject");
		expect(content).toContain("A test project");
		expect(content).toContain("Version: 1.0.0");
		expect(content).toContain("Author: Jane Doe");
		expect(content).toContain("License: MIT");
	});

	test("shouldInterpolateHandlebarsVariablesCorrectly", async () => {
		const template = `Project: {{projectName}}, Author: {{author}}, Repo: {{githubUsername}}/{{repositoryName}}`;
		mockReadFile.mockResolvedValueOnce(template);

		const content = await generateReadmeContent(validData);

		expect(content).toBe("Project: TestProject, Author: Jane Doe, Repo: janedoe/testproject");
	});

	test("shouldReturnExpectedReadmeFormat", async () => {
		const template = `# {{projectName}}\n\n{{description}}\n\n- Version: {{version}}\n- Author: {{author}}\n- License: {{license}}\n- Language: {{mainLanguage}}\n`;
		mockReadFile.mockResolvedValueOnce(template);

		const expected = `# TestProject

A test project

- Version: 1.0.0
- Author: Jane Doe
- License: MIT
- Language: TypeScript
`;

		const content = await generateReadmeContent(validData);

		expect(content).toBe(expected);
	});

	test("shouldThrowErrorWhenTemplateFileMissing", async () => {
		mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));
		await expect(generateReadmeContent(validData)).rejects.toThrow(
			"Failed to generate README content."
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"❌ Error generating README content:",
			expect.any(Error)
		);
	});

	test("shouldThrowErrorOnInvalidHandlebarsSyntax", async () => {
		const template = `# {{projectName}\n\n{{description}}`;
		mockReadFile.mockResolvedValueOnce(template);

		await expect(generateReadmeContent(validData)).rejects.toThrow(
			"Failed to generate README content."
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"❌ Error generating README content:",
			expect.objectContaining({ message: expect.stringContaining("Parse error") })
		);
	});

	test("shouldThrowErrorWhenDataMissingRequiredFields", async () => {
		const template = `# {{projectName}}\n\n{{description}}\n\nVersion: {{version}}\nAuthor: {{author}}\nLicense: {{license}}\n`;
		mockReadFile.mockResolvedValueOnce(template);

		// Remove required fields
		const incompleteData = {
			description: "Missing projectName and version",
			author: "",
			license: "",
			mainLanguage: "",
			githubUsername: "",
			repositoryName: "",
		} as ReadmeData;

		const content = await generateReadmeContent(incompleteData);
		expect(content).toContain("Missing projectName and version");
		expect(content).toContain("Author: ");
		expect(content).toContain("License: ");
	});
});
