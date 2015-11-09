# blot

> Dynamic and de-centralized API Blueprints

## tl;dr

API Blueprint + Hercule + Hazy = Magical documentation, fixtures, and tests

* Establishes a centralized source for documentation and test fixtures
* Reference and embed documentation / test fixtures by patterns or name
* Increases readability and dramatically eases maintenance of documentation, fixtures and tests

## Summary

[API Blueprint](https://github.com/apiaryio/api-blueprint) is an open-source specification for programmatically
documenting your APIs in pure Markdown. The specification is highly flexible and is focused on human readability.
API Blueprints also machine readable, they naturally support tooling. They can be used to generate mock servers,
automate integration testing, allow exportation of requests to tools such as Postman or cURL, and _much much_ more.

A limitation of API blueprints is that they are static, and there are few (if any) plugins for parsing
documented requests and responses for programmatic (in-code) use in your integration and unit tests.
My philosophy is that you should strive for a canonical source of fixtures in which all of your tests and documentation inherit from.
[Hercule](https://github.com/jamesramsay/hercule), which blot also integrates, helps enable decentralization by allowing
Markdown documents to be transcluded. However, this does not address the issue of having decentralized __fixtures__ with
repeated content.

blot minimizes duplication and introduces unification between documentation, fixtures, and API test suites. It sits
on top of Hazy and provides an abstract API blueprint parser and generator.

## Hazy

[Hazy](https://github.com/slurmulon/hazy) is a simple specification (with an accompanying node library) for lazily
generating dynamic test fixtures. It provides a simple syntax for interpolating random data (and more) into your fixtures.
It alleviates the need for developers to constantly come up with names, addresses, etc. for their enormous amount of test data.

The most powerful feature of hazy is that it allows developers to dynamically embed fixtures via `JsonPath` patterns or by a simple string.
This is very useful when creating and maintaining fixtures that share identical or related pieces of data, especially as an application grows.

In blot, hazy acts as a standardized bridge between your documentation and tests. It pushes your fixtures out of your code and
into a datastore such as your file system or a database, inherently canonical sources of data. Your API Blueprints and tests can
then be dynamically generated by processing the fixtures via the blot API.

## Examples

The following is an API blueprint decorated with some basic hazy tokens.
The `~` keyword tells hazy to replace the token with categorized random data:

```
### Login a user [POST]

+ Request (application/json)

    { "username": "|~text:word|", "password": "|~text:word|" }

+ Response 200 (application/json)

  { "token": "|~misc:guid|", "refresh_token": "|~misc:guid|", "expires": "|~time:date|" }

### Fetch a user [GET]

+ Response authentication (application/json)

  { "username": "|~text:word|", "first": "|~person:first|", "last": "|~person:last|", "address": "|~geo:address|" }
```

Alternatively, you can be more lazy, which is encouraged for increased decentralization. The following example
shows how you can reference and embed large fixtures that live on the filesystem using the `>` operator:

```
### Login a user [POST]

+ Request (application/json)

  |> auth-req.json|

+ Response 200 (application/json)

  |> auth-res.json|

### Fetch a user [GET]

+ Response 200 (application/json)

  |> authed-user-res.json|
```

## Command Line

The easiest way to use blot is by running it as a command.

You can specify an API blueprint to parse and export:

```bash
blot compile -i docs.blot.apib -o docs.apib
```

or simply pass in the raw data:

```bash
blot compile -d 'FORMAT: 1A
# The Simplest API
# GET /message
+ Response 200 (text/json)
{"message": "Hello, |~person:name|!", "id": "|~misc:guid|"}' -o docs.apib --pretty
```

### Node

The node module allows you to incorporate special functionality or data around your fixtures.
It's primary benefit is allowing you to configure and inject your own hazy fixture pool before
your API blueprint is processed:

```javascript
import gulp from 'gulp'
import hazy from 'hazy'
import blot from 'blot'
import moment from 'moment'

gulp.task('fixtures', ['clean'], () => {
  // ensure all fixtures have a created date
  hazy.matcher.config({
    path   : '$',
    handle : (fixture) => {
      return Object.assign({created: moment()}, fixture)
    }
  })

  // ensure any fixture urls are appended with a '&fixture' query param
  hazy.matcher.config({
    path   : '$..url',
    handle : (url) => {
      return `${url}&fixture=true`
    }
  })

  // globs and loads fixtures from filesystem into hazy's pool
  hazy.fixture.load('**/fixtures/*.json', null, (key) => key.replace('.json'))

  // tell blot to use the newly configured hazy object (and, by association, its fixture pool)
  blot.interpolator = hazy

  // load api blueprint, process fixtures against configured hazy pool, then export as a static blueprint file
  blot.Blueprint
    .load('documentation.blot.apib')
    .then(compiled => blot.toFile(compiled.content, 'dist/documentation.apib'))
})
```

## TODO

 - [ ] Static fixture export
 - [ ] Static HTML export
 - [ ] Support `beforeCompile` and `afterCompile` configuration files (root of project)
