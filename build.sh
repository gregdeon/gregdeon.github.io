# Build webpage
python build.py --template template/index_template.html --publications template/publications.yaml --output index.html --debug

# Build CV
python build.py --template cv/cv_template.tex --publications template/publications.yaml --output cv/cv.tex --debug
latexmk cv/cv.tex -pdf --outdir=cv --auxdir=cv/aux_files
mv cv/cv.pdf files/cv.pdf
