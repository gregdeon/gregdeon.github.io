"""
Build index.html from publications.

TODO: document keys in publications.yaml

"""

import argparse
import jinja2
import oyaml as yaml
import os

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

# custom jinja environments
JINJA_ENVS = {
    'default': jinja2.Environment(
        trim_blocks = True,
        lstrip_blocks = True,
        loader = jinja2.FileSystemLoader(os.path.abspath('.')),
    ),
    '.tex': jinja2.Environment(
        block_start_string = '\BLOCK{',
        block_end_string = '}',
        variable_start_string = '\VAR{',
        variable_end_string = '}',
        comment_start_string = '\#{',
        comment_end_string = '}',
        line_statement_prefix = '%%',
        line_comment_prefix = '%#',
        trim_blocks = True,
        lstrip_blocks = True,
        autoescape = False,
        loader = jinja2.FileSystemLoader(os.path.abspath('.')),
    ),
}

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--template', default='template/index_template.html', help='Template file')
parser.add_argument('--publications', default='template/publications.yaml', help='Publications YAML file')
parser.add_argument('--output', default='index.html', help='Output file')
parser.add_argument('--debug', action='store_true', help='Debug mode (verbose logging)')

if __name__ == '__main__':
    args = parser.parse_args()

    # enable debug messages if using debug flag 
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    # load publications yaml file 
    with open(args.publications, 'r') as f:
        publications = yaml.safe_load(f)

    # debug: print publications by category
    logging.debug(publications)
    for publication_type in publications:
        logging.debug(publication_type)
        if publications[publication_type] is not None:
            for publication in publications[publication_type]:
                logging.debug(f"- {publication['title']}")

    # read template
    _, template_extension = os.path.splitext(args.template)
    logging.debug(f'template_extension: {template_extension} ({"recognized" if template_extension in JINJA_ENVS else "unrecognized"})')
    jinja_env = JINJA_ENVS.get(template_extension, JINJA_ENVS['default'])
    template = jinja_env.get_template(args.template)

    # write file
    with open(args.output, 'w', encoding="utf-8") as f:
        f.write(template.render(publications=publications))
