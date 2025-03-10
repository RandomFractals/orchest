#!/usr/bin/env bash
set -e

NODE_MODULES_PATH=node_modules
BIN_PATH="$(npm bin)"
PATH="$BIN_PATH:$PATH"

function index_template_fill() {
  # Template transform index.html
  JS_PATH="{{JS_PATH}}"
  CSS_PATH="{{CSS_PATH}}"
  JS_FILE_NAME="$1"
  CSS_FILE_NAME="$2"

  cat public/index.html | sed "s/$JS_PATH/$JS_FILE_NAME/g" |
    sed "s/$CSS_PATH/$CSS_FILE_NAME/g" >dist/index.html
}

WATCH=false
while getopts ":-:" opt; do
  case ${opt} in
    -)
      if [ $OPTARG == "watch" ]; then
        WATCH=true
      fi
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done

# Copy everything to dist directory
mkdir -p dist/
rm -r dist
cp -R public/ dist/

JS_BUNDLE_PATH="dist/main.js"
CSS_BUNDLE_PATH="dist/style.css"

TS_SRC_PATH="src/main.tsx"
SASS_SRC_PATH="src/styles/main.scss"

ESBUILD_ARGS="$TS_SRC_PATH --bundle --minify --sourcemap --target=es6 --outfile=$JS_BUNDLE_PATH"
SASS_ARGS="$SASS_SRC_PATH --load-path=$NODE_MODULES_PATH $CSS_BUNDLE_PATH"

if $WATCH; then
  echo "Running in watch mode..."
  index_template_fill "main.js" "style.css"
  sass $SASS_ARGS --watch &
  esbuild $ESBUILD_ARGS --watch
else
  sass $SASS_ARGS && echo "Compiled $SASS_SRC_PATH successfully!" &
  esbuild $ESBUILD_ARGS

  wait $(jobs -p)

  md5_hash_command="md5sum"
  if ! command -v $md5_hash_command &> /dev/null
  then
    md5_hash_command="md5 -r"
  fi

  JS_BUNDLE_HASH=$($md5_hash_command $JS_BUNDLE_PATH | cut -d ' ' -f 1)
  CSS_BUNDLE_HASH=$($md5_hash_command $CSS_BUNDLE_PATH | cut -d ' ' -f 1)

  JS_FILE_NAME="main.js?hash=$JS_BUNDLE_HASH"
  CSS_FILE_NAME="style.css?hash=$CSS_BUNDLE_HASH"

  index_template_fill "$JS_FILE_NAME" "$CSS_FILE_NAME"
fi
