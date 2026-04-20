#!/usr/bin/env node

/**
 * Postinstall script for magneto-ai
 * Displays the Magneto banner and license information after npm install
 */

const chalk = require('chalk');

console.log(chalk.cyan('╔══════════════════════════════════════════════╗'));
console.log(chalk.cyan('║') + chalk.bold.yellow('           ⚡ MAGNETO AI ⚡                    ') + chalk.cyan('║'));
console.log(chalk.cyan('║') + chalk.white('   AI Reasoning & Agent Control Plane         ') + chalk.cyan('║'));
console.log(chalk.cyan('╚══════════════════════════════════════════════╝'));
console.log();
console.log(chalk.gray('MIT License'));
console.log(chalk.gray('Copyright (c) 2024 Riju Vashisht'));
console.log();
console.log(chalk.white('Thank you for installing Magneto AI!'));
console.log();
console.log(chalk.gray('To get started:'));
console.log(chalk.cyan('  magneto init') + chalk.gray('      # Initialize a new project'));
console.log(chalk.cyan('  magneto --help') + chalk.gray('    # Show available commands'));
console.log();
console.log(chalk.gray('Documentation: https://github.com/rijuvashisht/Magneto#readme'));
console.log();
