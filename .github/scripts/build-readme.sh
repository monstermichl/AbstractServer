#!/bin/bash

ROOT_PATH='../..'
README_TEMPLATE_PATH="README-template.md"
README_PATH="README.md"
LOAD_REGEX="<load:(.+)>"

# Set root directory.
pushd "${ROOT_PATH}" > /dev/null

# Create README.md.
echo -n "" > "${README_PATH}"

# Generate README.md content.
while read line; do
    line_content="${line}"

    if [[ "${line}" =~ ${LOAD_REGEX} ]]; then
        load_marker=${BASH_REMATCH[0]} # Get string to replace.
        file_content=$(cat "${BASH_REMATCH[1]}") # Get file content.
        line_content=$(echo "${line_content//"${load_marker}"/"${file_content}"}") # Replace marker with file content.
    fi

    # Write line to README file.
    echo "${line_content}" >> "${README_PATH}"
done < "${README_TEMPLATE_PATH}";

# Go back to this directory.
popd > /dev/null
