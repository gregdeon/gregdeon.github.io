"""
Build index.html from publications.

TODO: document keys in publications.yaml
"""

import argparse
import jinja2
import oyaml as yaml

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--template', default='template/index_template.html', help='Template file')
parser.add_argument('--publications', default='template/publications.yaml', help='Publications YAML file')
parser.add_argument('--output', default='index.html', help='Output file')
parser.add_argument('--debug', action='store_true', help='Debug mode (verbose logging)')

if __name__ == '__main__':
    args = parser.parse_args()
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    with open(args.publications, 'r') as f:
        publications = yaml.safe_load(f)

    logging.debug(publications)
    for publication_type in publications:
        logging.debug(publication_type)
        if publications[publication_type] is not None:
            for publication in publications[publication_type]:
                logging.debug(f"- {publication['title']}")

    with open(args.template, 'r', encoding="utf-8") as f:
        template = jinja2.Template(f.read(), trim_blocks=True, lstrip_blocks=True)

    with open(args.output, 'w', encoding="utf-8") as f:
        f.write(template.render(publications=publications))