interface Feature {
	name: string;
	text: string;
}

interface Technology {
	name: string;
	link: string;
}

export interface ReadmeData {
	projectName: string;
	description: string;
	version: string;
	author: string;
	license: string;
	mainLanguage: string;
	githubUsername: string;
	repositoryName: string;
	features?: Feature[];
	technologies?: Technology[];
	preview?: boolean;
	logo?: boolean;
}

export const defaultReadmeData: ReadmeData = {
	projectName: "",
	description: "",
	version: "1.0.0",
	author: "",
	license: "TBD",
	mainLanguage: "",
	githubUsername: "",
	repositoryName: "",
	features: [],
	technologies: [],
	preview: false,
	logo: false,
};
