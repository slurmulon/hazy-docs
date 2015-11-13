'use strict'

import * as hazy from '../node_modules/hazy/lib/hazy.js'
import protagonist from 'protagonist'
import hercule from 'hercule'

import _ from 'lodash'
import fs from 'fs'
import glob from 'glob'

/**
 * Parses, transcludes and compiles API blueprint files
 * and their associated fixtures. Allows compiled
 * API blueprints to be exported to the filesystem.
 */
export class Blueprint {

  /**
   * @param {String} markdown Valid API blueprint markdown
   */
  constructor(markdown: String) {
    this.markdown = markdown

    const statics = ['compile', 'fixtures', 'interpolate', 'parse', 'transclude']

    statics.forEach(method => {
      this[method] = () => Blueprint[method](this.markdown)
    })
  }

  /**
   * Compiles API blueprint markdown data by translcuding it and then parsing it for fixtures
   *
   * @param {String} markdown
   * @returns {Promise}
   */
  static compile(markdown: String): Promise {
    return Blueprint
      .transclude(markdown)
      .then(embedMd => Blueprint.interpolate(embedMd))
      .then(finalMd => Blueprint.fixtures(finalMd).then(fixtures => {
        return Object.assign(this, {compiled: {fixtures, markdown: finalMd}})
      }))
  }

  /**
   * Extracts JSON fixtures from API blueprint markdown
   *
   * @param {String} markdown
   * @returns {Promise}
   */
  static fixtures(markdown: String): Promise {
    return new Promise((resolve, reject) => {
      let fixtures = []
      const jsonStrMatches = markdown.match(plainJson)

      jsonStrMatches && jsonStrMatches.forEach(jsonStr => {
        try {
          const fixture = JSON.parse(jsonStr)

          fixtures.push(fixture)
        } catch (e) {
          if (e instanceof SyntaxError) {
            reject(`Found invalid JSON in API blueprint ${blueprint.filepath}: ${jsonStr}\n\n${e}`)
          } else {
            reject(`Failed to parse JSON fixtures in API blueprint: ${e}`)
          }
        }
      })

      resolve(fixtures)
    })
  }

  /**
   * Parses markdown into a usable object via protagonist
   *
   * @param {String} markdown Valid API blueprint markdown
   */
  static parse(markdown: String): Promise {
    return new Promise((resolve, reject) => {
      if (markdown) {
        protagonist.parse(markdown, (err, blueprint) => {
          if (!err) {
            resolve(blueprint)
          } else {
            reject(`Failed to parse file as valid API blueprint: ${err}`)
          }
        })
      } else {
        reject(`Markdown data required`)
      }
    })
  }

  /**
   * Scans API blueprint markdown for Hercule references and transcludes them
   *
   * @param {String} markdown
   * @returns {Promise}
   */
  static transclude(markdown: String): Promise {
    return new Promise((resolve, reject) => {
      if (markdown) {
        hercule.transcludeString(markdown, (transMd) => {
          if (transMd) {
            resolve(transMd)
          } else {
            reject('Failed to parse markdown for Hercule transclusions')
          }
        })

      } else {
        reject('Valid markdown required for transclusion')
      }
    })
  }

  /**
   * Interpolates markdown with relevant replacements. Uses hazy's random
   * fixture data interpolator by default
   *
   * @param {String} markdown
   * @returns {Promise}
   */
  static interpolate(markdown: String): Promise {
    return new Promise((resolve, reject) => resolve(interpolator.lang.process(markdown)))
  }

  /**
   * Parses and compiles an API blueprint from the file system
   *
   * @param {String} filepath
   * @returns {Promise}
   */
  static src(filepath: String): Promise {
    return new Promise((resolve, reject) => {
      if (filepath) {
        fs.readFile(__dirname + '/' + filepath, 'utf-8', (err, data) => {
          if (!err) {
            resolve(new Blueprint(data).compile())
          } else {
            reject(`Failed to read file: ${error}`)
          }
        })
      } else {
        reject(`Failed to read file, filepath required`)
      }  
    })
  }

  /**
   * Globs and reads in valid API blueprint(s) from the filesystem and compiles them
   *
   * @param {Array|String} blueprints
   * @returns {Promise}
   */
  static glob(pattern, options): Promise {
    return new Promise((resolve, reject) => {
      glob(pattern, options, (err, files) => {
        if (!err) {
          return Promise.all(
            files.map(file => new Blueprint(file).compile())
          )
        } else {
          reject(`Failed to load file: ${err}`)
        }
      })
    })
  }

  /**
   * Reads in valid API blueprint(s) from Strings or 
   * Arrays of Strings and compiles them
   *
   * @param {Array|String} blueprints
   * @returns {Promise}
   */
  static read(blueprints): Promise {
    return new Promise((resolve, reject) => {
      if (_.isArray(blueprints)) {
        resolve(Promise.all(
          blueprints.map(bp => new Blueprint(bp).compile())
        ))
      } else if (_.isString(blueprints)) {
        resolve(new Blueprint(blueprints).compile())
      } else {
        reject('Documents must be represented as a String or Array, got ' + typeof blueprints)
      }
    })
  }

  /**
   * Exports API blueprint as either a static html or apib file
   * to the provided file path
   *
   * @param {String} filepath
   * @returns {Promise}
   */
  dist(fixtures, filepath: String): Promise {
    return new Promise((resolve, reject) => {
      const extension = filepath.match(/\.(.*?)$/)

      if (extension) {
        this.read(fixtures)
          .then(consumed => this.marshall(consumed.compiled.content, extension[0]))
          .then(marshalled => {
            fs.writeFile(destination, marshalled, 'utf-8', (err) => {
              if (!err) {
                resolve(content)
              } else {
                reject(`An error occured while saving file: ${err}`)
              }
            })
          })
      } else {
        reject(`File destinations must contain an extension (.apib or .html)`)
      }
    })
  }

  /**
   * Attempts to marshall API blueprint content into a specific type
   *
   * @param {String} markdown
   * @param {String} filetype 'apib' or 'json'
   * @returns {Promise}
   */
  marshall(markdown: String, filetype: String): Promise {
    return new Promise((resolve, reject) => {
      const filetypes = {
        apib: () => resolve(markdown),
        json: () => Blueprint.fixtures(markdown).then(resolve)
      }

      if (filetype in filetypes) {
        filetypes[filetype]()
      } else {
        reject(`Unsupported filetype: ${filetype}`)
      }
    })
  }

}



/**
 * Allows developers to configure and override the default instance of hazy
 */
export var interpolator = hazy

/**
 * A janky regex for finding "JSON" objects in markdown.
 */
export const plainJson = /\{(.*?)\}/gm
