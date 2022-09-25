#!/bin/bash

# Constants
EXTENSION=".ts"
SRC_PATH="./src"
INDEX_TS_FILE="index${EXTENSION}"
EXPORT_PATTERN="export[[:blank:]][a-zA-Z0-9_]+[[:blank:]]+([a-zA-Z0-9_]+)[[:blank:]]*(extends|implements|\{|\=)"

# Variables
exports=()

function write_to_index_ts {
    echo "$1" >> "${INDEX_TS_FILE}"
}

# Switch to src folder.
pushd "${SRC_PATH}" > /dev/null

# Create index.ts.
echo -n "" > "${INDEX_TS_FILE}"

# Iterate over files.
for file in $(ls); do
    exports_temp=()

    # Only process files which are not index.ts.
    if [ "${file}" != "${INDEX_TS_FILE}" ]; then
        # Read code line by line and look for exports.
        while read code; do
            if [[ "${code}" =~ ${EXPORT_PATTERN} ]]; then
                exports_temp+=("${BASH_REMATCH[1]}")
            fi
        done < "${file}"

        # If exports were found in the file, write them as imports.
        if [ ${#exports_temp[@]} -gt 0 ]; then
            write_to_index_ts "import {"
            for value in ${exports_temp[@]}; do
                write_to_index_ts "    ${value},"
                exports+=("${value}")
            done
            write_to_index_ts "} from './${file/"${EXTENSION}"/}';"
        fi
    fi
done

write_to_index_ts ""
write_to_index_ts "export {"
for value in ${exports[@]}; do
    write_to_index_ts "    ${value},"
done
write_to_index_ts "};"

# Add update info
write_to_index_ts ""
write_to_index_ts "/* Automatically generated on $(date). */"

# Return to root path.
popd > /dev/null
