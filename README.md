# v7cli

# THIS TOOL IS A WORK IN PROGRESS. IT IS NOT READY FOR REAL-WORLD USE.

A command-line utility for developing ArcOS v7 applications.

## Usage

- `npx v7cli new <folder_name>` - Walks you through creating a new project in `<folder_name>`
- `npx v7cli dev` - Starts the development server for the current working directory
- `npx v7cli build` - Packages the app for installation on ArcOS

## Getting started

I'll now walk you through creating a project called "Clock":

- First, run `npx v7cli new clock` to create a new project in a folder named `clock`
- Next, follow along with the wizard until you're back at the prompt. Please note that any of the values you enter can be changed later.
- Then, run `code clock` to open your project in a new Visual Studio Code window.
- Develop your app. Remember to run `npx v7cli dev` to start the development environment.
- When you're done, use `npx v7cli build` to generate the `.arc` file you can use for installing the application

## Author

Izaak Kuipers <izaak.kuipers@gmail.com> (https://izkuipers.nl)

## License

[MIT](LICENSE)
