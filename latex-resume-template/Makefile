# LaTeX CV Template Makefile
# Provides convenient commands for compiling the CV templates

# Default template to compile
TEMPLATE = academic_cv_template

# LaTeX compiler
LATEX = pdflatex

# Output directory
OUTDIR = output

.PHONY: all clean help academic example simple preview

# Default target
all: academic

# Compile the main academic template
academic:
	@echo "Compiling academic CV template..."
	@mkdir -p $(OUTDIR)
	$(LATEX) -output-directory=$(OUTDIR) academic_cv_template.tex
	$(LATEX) -output-directory=$(OUTDIR) academic_cv_template.tex
	@echo "✅ Academic template compiled: $(OUTDIR)/academic_cv_template.pdf"

# Compile the example with real data
example:
	@echo "Compiling example CV..."
	@mkdir -p $(OUTDIR)
	$(LATEX) -output-directory=$(OUTDIR) chaoran_feng_cv_example.tex
	$(LATEX) -output-directory=$(OUTDIR) chaoran_feng_cv_example.tex
	@echo "✅ Example CV compiled: $(OUTDIR)/chaoran_feng_cv_example.pdf"

# Compile the simple template
simple:
	@echo "Compiling simple CV template..."
	@mkdir -p $(OUTDIR)
	$(LATEX) -output-directory=$(OUTDIR) simple_cv_template.tex
	$(LATEX) -output-directory=$(OUTDIR) simple_cv_template.tex
	@echo "✅ Simple template compiled: $(OUTDIR)/simple_cv_template.pdf"

# Compile all templates
all-templates: academic example simple
	@echo "✅ All templates compiled successfully!"

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -rf $(OUTDIR)
	rm -f *.aux *.log *.out *.fdb_latexmk *.fls *.synctex.gz
	@echo "✅ Cleanup complete"

# Quick preview (compile example)
preview: example
	@echo "Opening example CV..."
	@if command -v xdg-open > /dev/null; then \
		xdg-open $(OUTDIR)/chaoran_feng_cv_example.pdf; \
	elif command -v open > /dev/null; then \
		open $(OUTDIR)/chaoran_feng_cv_example.pdf; \
	else \
		echo "Please open $(OUTDIR)/chaoran_feng_cv_example.pdf manually"; \
	fi

# Show help
help:
	@echo "LaTeX CV Template Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  academic      - Compile the main academic template"
	@echo "  example       - Compile the example with sample data"
	@echo "  simple        - Compile the simple single-column template"
	@echo "  all-templates - Compile all template variants"
	@echo "  preview       - Compile and open the example CV"
	@echo "  clean         - Remove all generated files"
	@echo "  help          - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make academic     # Compile the blank template"
	@echo "  make example      # Compile the example CV"
	@echo "  make preview      # Quick compile and view"
	@echo "  make clean        # Clean up files"