import * as fs from "fs/promises";
import * as path from "path";
import { getPackageJsonData } from "../src/utils/packageJson";

jest.mock("fs/promises", () => ({
	readFile: jest.fn(),
	access: jest.fn(),
	mkdir: jest.fn(),
	unlink: jest.fn(),
	rmdir: jest.fn(),
	writeFile: jest.fn(),
}));

describe("getPackageJsonData", () => {
	const mockReadFile = fs.readFile as jest.Mock;

	beforeEach(() => {
		mockReadFile.mockClear();
	});

	test("shouldExtractFieldsFromValidPackageJsonWithStringAuthorAndGithubUrl", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "awesome-lib",
				description: "Awesome library",
				version: "2.3.4",
				author: "octocat <octocat@github.com>",
				license: "Apache-2.0",
				repository: {
					type: "git",
					url: "https://github.com/octocat/awesome-lib.git",
				},
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "awesome-lib",
			description: "Awesome library",
			version: "2.3.4",
			author: "octocat",
			license: "Apache-2.0",
			githubUsername: "octocat",
			repositoryName: "awesome-lib",
		});
		expect(mockReadFile).toHaveBeenCalledWith(path.join(process.cwd(), "package.json"), {
			encoding: "utf-8",
		});
	});

	test("shouldExtractFieldsFromPackageJsonWithObjectAuthorAndGitHub_url", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "github-project",
				description: "A Github project",
				version: "0.9.1",
				author: { name: "githubuser", email: "user@github.com" },
				license: "GPL-3.0",
				repository: {
					type: "git",
					url: "https://github.com/githubuser/github-project.git",
				},
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "github-project",
			description: "A Github project",
			version: "0.9.1",
			author: "githubuser",
			license: "GPL-3.0",
			githubUsername: "githubuser",
			repositoryName: "github-project",
		});
	});

	test("shouldReturnDefaultsWhenOptionalFieldsMissing", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "minimal",
				version: "1.2.3",
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "minimal",
			description: "",
			version: "1.2.3",
			author: "",
			license: "MIT",
			githubUsername: "",
			repositoryName: "minimal",
		});
	});

	test("shouldReturnEmptyObjectWhenPackageJsonMissing", async () => {
		mockReadFile.mockRejectedValueOnce(new Error("ENOENT: no such file or directory"));

		const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
		const data = await getPackageJsonData();
		expect(data).toEqual({});
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Could not read or parse package.json")
		);
		consoleWarnSpy.mockRestore();
	});

	test("shouldReturnEmptyObjectOnInvalidJson", async () => {
		mockReadFile.mockResolvedValueOnce("{ invalid json }");

		const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
		const data = await getPackageJsonData();
		expect(data).toEqual({});
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Could not read or parse package.json")
		);
		consoleWarnSpy.mockRestore();
	});

	test("shouldSetAuthorToGithubUsernameIfAuthorMissingAndGithubUrlPresent", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "no-author-project",
				description: "Project without explicit author",
				version: "1.0.0",
				license: "ISC",
				repository: {
					type: "git",
					url: "https://github.com/anotheruser/no-author-project.git",
				},
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "no-author-project",
			description: "Project without explicit author",
			version: "1.0.0",
			author: "anotheruser",
			license: "ISC",
			githubUsername: "anotheruser",
			repositoryName: "no-author-project",
		});
	});

	test("shouldNotSetGithubUsernameIfAuthorStringHasSpaces", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "spaced-author-project",
				description: "Project with author name having spaces",
				version: "1.0.0",
				author: "First Lastname <email@example.com>",
				license: "MIT",
				repository: {
					type: "git",
					url: "https://github.com/firstlast/spaced-author-project.git",
				},
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "spaced-author-project",
			description: "Project with author name having spaces",
			version: "1.0.0",
			author: "First Lastname",
			license: "MIT",
			githubUsername: "firstlast",
			repositoryName: "spaced-author-project",
		});
	});

	test("shouldNotSetGithubUsernameIfAuthorObjectNameHasSpaces", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "object-spaced-author-project",
				description: "Project with object author name having spaces",
				version: "1.0.0",
				author: { name: "Another User", email: "another@example.com" },
				license: "Apache-2.0",
				repository: {
					type: "git",
					url: "https://github.com/anotheruser/object-spaced-author-project.git",
				},
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "object-spaced-author-project",
			description: "Project with object author name having spaces",
			version: "1.0.0",
			author: "Another User",
			license: "Apache-2.0",
			githubUsername: "anotheruser",
			repositoryName: "object-spaced-author-project",
		});
	});

	test("shouldHandleAuthorObjectWithoutNameField", async () => {
		mockReadFile.mockResolvedValueOnce(
			JSON.stringify({
				name: "no-author-name-object-project",
				description: "Project with author object but no name",
				version: "1.0.0",
				author: { url: "http://example.com" },
				license: "MIT",
				repository: {
					type: "git",
					url: "https://github.com/someuser/no-author-name-object-project.git",
				},
			})
		);

		const data = await getPackageJsonData();

		expect(data).toEqual({
			projectName: "no-author-name-object-project",
			description: "Project with author object but no name",
			version: "1.0.0",
			author: "someuser",
			license: "MIT",
			githubUsername: "someuser",
			repositoryName: "no-author-name-object-project",
		});
	});
});
