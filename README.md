# pappet

![npm](https://img.shields.io/npm/v/pappet.svg)
![npm](https://img.shields.io/npm/dm/pappet.svg)

Pappet is a command-line tool to crawl websites using puppeteer. 
It allows you to crawl multiple pages in parallel and recursively. Take screenshots or create PDFs in seconds.

Install
--
```sh
npm i -g pappet
```

Usage
--
```text
Usage: pappet [OPTION]... [URL]...
Options:
  --help                 Show help
  --version              Show version number
  -q, --quit             Be quit
  -t, --tabs             Set number of pages
  -s, --screenshot       Take a screenshot
  -p, --pdf              Take a PDF
  -r, --recursive        Recursively visit links
  -l, --level            Set recursion depth
  -w, --width            Set page width
  -h, --height           Set page height
  -f, --full-page        Take a screenshot of the full scrollable page
  -L, --relative         Follow relative links only
  --device-scale-factor  Specify device scale factor
  --is-mobile            Take meta viewport into account
  --has-touch            Support touch events
  --is-landscape         Set viewport in landscape mode
  --https-only           Follow HTTPS links only
  --same-origin          Only visit pages with same origin
  --disable-js           Disable javascript
  --user-agent           Set user agent
```

Examples
--
Pappet allows you to write most of the options in a long and short form. I will use the shorter syntax here for convenience.

##### Take a screenshot (-s, --screenshot)
```sh
pappet -s https://example.com
```
You can also specify the width and height of the viewport.
```sh
pappet -s -w 800 -h 600 https://example.com
```
Take a screenshot of the full scrollable page. By specifying the option `-f` or `--full-page`.
```sh
pappet -sf https://example.com
```

##### Take a PDF (-p, --pdf)
```sh
pappet -p https://example.com
```

##### Crawl a website recursively and take screenshots (-r, --recursive)
```sh
pappet -sr https://example.com
```
When crawling websites recursively you should specify a maximum depth (default 1) for not crawling to long. 
You can do that by using the `-l` or `--level` option.
```sh
pappet -srl2 https://example.com
```

##### Crawl multiple pages at once
You can specify a infinite number of URLs to crawl.
```sh
pappet -rs https://example.com https://example.com
```
When doing this it's recommended to use the option `-t` or `--tabs`. 
This will set the maximum number of pages used by puppeteer (default 2). The more pages you have the faster it will be.
Be careful by specifying this option. Some websites may block you, for sending to many requests at once.
```
pappet -rst4 https://example.com
```

##### Disable javascript and take a screenshot
```sh
pappet -sf --disable-js https://example.com
```

##### Only visit pages with same origin
This will only follow links of the same origin (`example.com`).
```sh
pappet -rs --same-origin https://example.com
```

##### Only follow relative links
```sh
pappet -rsL https://example.com
```
