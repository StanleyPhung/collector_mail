import TurndownService from 'turndown';

// Create a new instance of TurndownService with specified options
export const turndown = new TurndownService({
    headingStyle: 'atx', // Use ATX-style headings (e.g., # Heading)
    codeBlockStyle: 'fenced', // Use fenced code blocks (e.g., ``` Code ```)
    emDelimiter: '*', // Use asterisks for emphasis (e.g., *emphasis*)
    strongDelimiter: '**', // Use double asterisks for strong emphasis (e.g., **strong emphasis**)
    bulletListMarker: '-', // Use hyphens for bullet lists (e.g., - Item)
    linkStyle: 'inlined', // Inline links (e.g., [Link Text](https://example.com))
});

// Add a rule to remove link tags from the Markdown output
turndown.addRule('linkRemover', {
    filter: 'a', // Filter for anchor tags
    replacement: (content) => content, // Replace the anchor tag with its content
});

// Add a rule to remove style tags from the Markdown output
turndown.addRule('styleRemover', {
    filter: 'style', // Filter for style tags
    replacement: () => '', // Replace the style tag with an empty string
});

// Add a rule to remove script tags from the Markdown output
turndown.addRule('scriptRemover', {
    filter: 'script', // Filter for script tags
    replacement: () => '', // Replace the script tag with an empty string
});

// Add a rule to remove image tags from the Markdown output
turndown.addRule('imageRemover', {
    filter: 'img', // Filter for image tags
    replacement: (content) => content, // Replace the image tag with its content
});
