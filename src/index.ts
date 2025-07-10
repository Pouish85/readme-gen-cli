import { defaultReadmeData, ReadmeData } from './data';
import * as fs from 'fs/promises';
import * as path from 'path';
import prompts from "prompts";
import Handlebars from 'handlebars';
import * as fsp from 'fs/promises';

/**
 * Read the package.json file from the current directory and extract relevant information.
 * @returns {Promise<Partial<ReadmeData>>}
 */
async function getPackageJsonData(): Promise<Partial<ReadmeData>> {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  try {
    const fileContent = await fs.readFile(packageJsonPath, { encoding: 'utf-8' });
    const packageJson = JSON.parse(fileContent);

    let projectName = packageJson.name || '';
    let description = packageJson.description || '';
    let version = packageJson.version || '1.0.0';
    let author = '';
    let githubUsername = '';
    let repositoryName = projectName;
    let license = packageJson.license || 'MIT';

    if (typeof packageJson.author === 'string') {
      author = packageJson.author.split('<')[0].trim();
      if (author && !author.includes(' ') && !author.includes('/')) {
         githubUsername = author;
      }
    } else if (packageJson.author?.name) {
      author = packageJson.author.name;
       if (author && !author.includes(' ') && !author.includes('/')) {
         githubUsername = author;
      }
    }

    const repoUrl = packageJson.repository?.url || packageJson.homepage || '';
    if (repoUrl.includes('github.com')) {
      const parts = repoUrl.split('/');
      if (parts.length >= 5) {
        githubUsername = parts[3];
        repositoryName = parts[4].replace('.git', '');
      }
    } else if (repoUrl.includes('gitlab.com')) {
        const parts = repoUrl.split('/');
        if (parts.length >= 5) {
            githubUsername = parts[3];
            repositoryName = parts[4].replace('.git', '');
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
    console.warn('⚠️ Could not read or parse package.json. Some information may need to be entered manually.');
    return {};
  }
}

/**
 * Generate the README.md content using Handlebars template engine.
 * @param {ReadmeData} data
 * @returns {Promise<string>}
 */
async function generateReadmeContent(data: ReadmeData): Promise<string> {
  const templatePath = path.join(__dirname, '..', 'templates', 'basic-readme.hbs');
  try {
    const templateContent = await fsp.readFile(templatePath, { encoding: 'utf-8' });
    const template = Handlebars.compile(templateContent);
    const compiledReadme = template(data);
    return compiledReadme;
  } catch (error) {
    console.error('❌ Error generating README content:', error);
    throw new Error('Failed to generate README content.');
  }
}

async function main() {
  const packageData = await getPackageJsonData();

  let currentData: ReadmeData = {
    ...defaultReadmeData,
    ...packageData,
  };

  console.log('\n--- Let\'s generate your README.md! ---\n');
  console.log('We\'ve extracted some information from your package.json. Please confirm or modify:\n');

  const confirmOrPrompt = async (
    name: keyof ReadmeData,
    message: string,
    initialValue: string
  ): Promise<string> => {
    const confirmation = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `${message}: "${initialValue}"?`,
      initial: true
    });

    if (confirmation.confirmed) {
      return initialValue;
    } else {
      const customValue = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter the new ${message}:`,
        initial: initialValue
      });
      return customValue.value || initialValue;
    }
  };

  currentData.projectName = await confirmOrPrompt('projectName', 'Project name', currentData.projectName);
  currentData.description = await confirmOrPrompt('description', 'Project description', currentData.description);
  currentData.version = await confirmOrPrompt('version', 'Project version', currentData.version);
  currentData.author = await confirmOrPrompt('author', 'Author name', currentData.author);
  currentData.license = await confirmOrPrompt('license', 'Project license', currentData.license);
  currentData.githubUsername = await confirmOrPrompt('githubUsername', 'GitHub username', currentData.githubUsername);
  currentData.repositoryName = await confirmOrPrompt('repositoryName', 'Repository name (on GitHub)', currentData.repositoryName);
  currentData.mainLanguage = await confirmOrPrompt('mainLanguage', 'Main programming language', currentData.mainLanguage || defaultReadmeData.mainLanguage);

  console.log('\n--- Features ---\n');
  currentData.features = [];
  let addMoreFeatures = true;
  while (addMoreFeatures) {
    const featurePrompt = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Enter feature name (e.g., "User Authentication"):',
      },
      {
        type: 'text',
        name: 'text',
        message: 'Enter feature description (e.g., "Allows users to register and log in."):',
      }
    ]);

    if (featurePrompt.name && featurePrompt.text) {
      currentData.features.push({ name: featurePrompt.name, text: featurePrompt.text });
      const anotherFeature = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Add another feature?',
        initial: true
      });
      addMoreFeatures = anotherFeature.confirm;
    } else {
      console.log('Skipping feature as name or description was empty.');
      addMoreFeatures = false;
    }
  }

  console.log('\n--- Technologies ---\n');
  currentData.technologies = [];
  let addMoreTechnologies = true;
  while (addMoreTechnologies) {
    const technologyPrompt = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Enter technology name (e.g., "React"):',
      },
      {
        type: 'text',
        name: 'link',
        message: 'Enter technology link (e.g., "https://react.dev"):',
      }
    ]);

    if (technologyPrompt.name && technologyPrompt.link) {
      currentData.technologies.push({ name: technologyPrompt.name, link: technologyPrompt.link });
      const anotherTechnology = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Add another technology?',
        initial: true
      });
      addMoreTechnologies = anotherTechnology.confirm;
    } else {
      console.log('Skipping technology as name or link was empty.');
      addMoreTechnologies = false;
    }
  }
  console.log('\n--- Style ---\n');
  const LogoPrompt = await prompts({
    type: "select",
    name: "logo",
    message: "Would you like to include a logo in your README?",
    choices: [
      { title: 'Yes', value: true },
      { title: 'No', value: false }
    ],
  });
  currentData.logo = LogoPrompt.logo;

  const previewPrompt = await prompts({
    type: "select",
    name: "preview",
    message: "Would you like to include a preview section in your README?",
    choices: [
      { title: 'Yes', value: true },
      { title: 'No', value: false }
    ],
  });
  currentData.preview = previewPrompt.preview;


  console.log('\n--- Generating README.md... ---');

  try {
    const readmeContent = await generateReadmeContent(currentData);
    const outputPath = path.join(process.cwd(), 'README.md');

    await fsp.writeFile(outputPath, readmeContent, { encoding: 'utf-8' });
    console.log(`✅ README.md generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate or write README.md:', error);
  }
}

main();
