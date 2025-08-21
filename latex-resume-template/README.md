# Academic CV LaTeX Template

A professional LaTeX resume template inspired by modern academic homepage designs. This template replicates the clean, academic styling found in contemporary researcher websites.

## 📋 Features

- **Clean Professional Layout**: Modern academic CV design with proper spacing and typography
- **Serif Typography**: Uses Times-like fonts for professional academic appearance
- **Color Scheme**: Professional blue accents matching academic website designs
- **Modular Sections**: Easy to customize and rearrange sections
- **Icon Support**: FontAwesome icons for contact information and visual elements
- **Responsive Design**: Optimized layout that works well for printing and digital viewing
- **Two-Column Layout**: Main content area with sidebar for awards and activities

## 🎨 Design Elements

- **Header**: Name, title, institution, and contact information with icons
- **Profile Photo**: Right-aligned placeholder for professional headshot
- **Education**: Chronological academic history with emoji accents
- **Biography**: Research interests and academic background
- **News**: Recent achievements and publications announcements
- **Selected Projects**: Categorized research projects with links and descriptions
- **Awards**: Academic honors and recognitions
- **Professional Activities**: Conference and journal reviewing activities

## 📁 Template Files

1. **`academic_cv_template.tex`** - The main template with placeholder content
2. **`chaoran_feng_cv_example.tex`** - Example CV with real academic content
3. **`README.md`** - This documentation file

## 🚀 Quick Start

### Prerequisites

You need a LaTeX distribution installed on your system:
- **Windows**: [MiKTeX](https://miktex.org/) or [TeX Live](https://tug.org/texlive/)
- **macOS**: [MacTeX](https://tug.org/mactex/)
- **Linux**: Install `texlive-full` package

### Required LaTeX Packages

The template uses the following packages (most are included in standard distributions):
- `geometry` - Page layout
- `mathptmx` - Times-like serif font
- `xcolor` - Color support
- `titlesec` - Section formatting
- `enumitem` - List customization
- `hyperref` - Hyperlinks
- `fontawesome5` - Icons
- `graphicx` - Image support

### Compilation

1. **Download the template**:
   ```bash
   # Use either the blank template or the example
   cp academic_cv_template.tex my_cv.tex
   # OR
   cp chaoran_feng_cv_example.tex my_cv.tex
   ```

2. **Edit the content**:
   - Replace placeholder text in square brackets `[Your Name]`
   - Update contact information
   - Add your education, experience, and projects
   - Customize sections as needed

3. **Compile the PDF**:
   ```bash
   pdflatex my_cv.tex
   # Run twice to resolve references
   pdflatex my_cv.tex
   ```

### Online Compilation

You can also use online LaTeX editors:
- [Overleaf](https://www.overleaf.com/) - Copy and paste the template code
- [ShareLaTeX](https://www.sharelatex.com/) - Upload the .tex file

## 🛠️ Customization Guide

### Colors

The template defines custom colors that can be modified:

```latex
\definecolor{darkblue}{RGB}{38,48,84}      % Section headings
\definecolor{linkblue}{RGB}{16,66,159}     % Hyperlinks
\definecolor{lightgray}{RGB}{119,119,119}  % Secondary text
```

### Sections

Add new sections using the `\cvsection{}` command:

```latex
\cvsection{New Section}
Content goes here...
```

### Contact Icons

Customize contact information with FontAwesome icons:

```latex
\emailicon\ \href{mailto:your.email@domain.com}{your.email@domain.com}
\scholaricon\ \href{https://scholar.google.com/citations?user=YOUR_ID}{Google Scholar}
\githubicon\ \href{https://github.com/yourusername}{GitHub}
```

### Project Entries

Use the `projectentry` environment for consistent project formatting:

```latex
\begin{projectentry}
    {Project Title with Emoji}
    {Author List}
    {Brief description of the project and its contributions.}
\end{projectentry}
```

### Profile Photo

Replace the placeholder with your photo:

```latex
% Replace the placeholder box with:
\includegraphics[width=3cm]{path/to/your/photo.jpg}
```

## 📐 Layout Structure

```
┌─────────────────────────────────────────┐
│ [Name, Title, Institution, Contact]    │
├─────────────────────────┬───────────────┤
│ Education              │ Profile Photo │
│                        │               │
│ Biography              │ Awards        │
│                        │               │
│ News                   │ Professional  │
│                        │ Activities    │
│ Selected Projects      │               │
│ ├─ Category 1          │               │
│ ├─ Category 2          │               │
│                        │               │
└─────────────────────────┴───────────────┘
│            Footer               │
└─────────────────────────────────┘
```

## 🎯 Best Practices

1. **Keep it concise**: Academic CVs should be comprehensive but readable
2. **Use consistent formatting**: Stick to the established patterns for dates and entries
3. **Optimize for both screen and print**: The template works well in both contexts
4. **Regular updates**: Keep the "Last updated" date current
5. **Professional email**: Use institutional email addresses when possible
6. **Quality links**: Ensure all hyperlinks are working and professional

## 🔧 Troubleshooting

### Common Issues

1. **Missing packages**: Install required packages through your LaTeX distribution
2. **Font issues**: Ensure `mathptmx` package is available
3. **Icon problems**: Update `fontawesome5` package to latest version
4. **Compilation errors**: Run `pdflatex` twice to resolve cross-references

### Package Installation

If packages are missing:

```bash
# Ubuntu/Debian
sudo apt-get install texlive-fonts-recommended texlive-fonts-extra

# macOS with Homebrew
brew install --cask mactex

# Windows with MiKTeX
# Use MiKTeX Package Manager to install missing packages
```

## 📄 License

This template is provided under the MIT License. Feel free to use and modify for personal and professional use.

## 🤝 Contributing

Improvements and suggestions are welcome! Feel free to:
- Report issues or bugs
- Suggest new features or design improvements
- Submit pull requests with enhancements
- Share your customized versions

## 🙏 Acknowledgments

This template is inspired by:
- Modern academic homepage designs
- [SuperFCR's GitHub Pages](https://superfcr.github.io/) layout and styling
- Academic CV best practices from leading institutions

---

**Happy CV building! 🎓**

For questions or support, please open an issue or contact the template maintainers.