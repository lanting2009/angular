import {CssLexer} from '@angular/compiler/src/css/lexer';
import {BlockType, CssBlockAST, CssBlockDefinitionRuleAST, CssBlockRuleAST, CssDefinitionAST, CssInlineRuleAST, CssKeyframeDefinitionAST, CssKeyframeRuleAST, CssMediaQueryRuleAST, CssParseError, CssParser, CssRuleAST, CssSelectorAST, CssSelectorRuleAST, CssStyleSheetAST, CssStyleValueAST, ParsedCssResult} from '@angular/compiler/src/css/parser';
import {afterEach, beforeEach, ddescribe, describe, expect, iit, it, xit} from '@angular/core/testing/testing_internal';

import {BaseException} from '../../src/facade/exceptions';

export function assertTokens(tokens: any /** TODO #9100 */, valuesArr: any /** TODO #9100 */) {
  for (var i = 0; i < tokens.length; i++) {
    expect(tokens[i].strValue == valuesArr[i]);
  }
}

export function main() {
  describe('CssParser', () => {
    function parse(css: any /** TODO #9100 */): ParsedCssResult {
      var lexer = new CssLexer();
      var scanner = lexer.scan(css);
      var parser = new CssParser(scanner, 'some-fake-file-name.css');
      return parser.parse();
    }

    function makeAST(css: any /** TODO #9100 */): CssStyleSheetAST {
      var output = parse(css);
      var errors = output.errors;
      if (errors.length > 0) {
        throw new BaseException(errors.map((error: CssParseError) => error.msg).join(', '));
      }
      return output.ast;
    }

    it('should parse CSS into a stylesheet AST', () => {
      var styles = `
        .selector {
          prop: value123;
        }
      `;

      var ast = makeAST(styles);
      expect(ast.rules.length).toEqual(1);

      var rule = <CssSelectorRuleAST>ast.rules[0];
      var selector = rule.selectors[0];
      expect(selector.strValue).toEqual('.selector');

      var block: CssBlockAST = rule.block;
      expect(block.entries.length).toEqual(1);

      var definition = <CssDefinitionAST>block.entries[0];
      expect(definition.property.strValue).toEqual('prop');

      var value = <CssStyleValueAST>definition.value;
      expect(value.tokens[0].strValue).toEqual('value123');
    });

    it('should parse mutliple CSS selectors sharing the same set of styles', () => {
      var styles = `
        .class, #id, tag, [attr], key + value, * value, :-moz-any-link {
          prop: value123;
        }
      `;

      var ast = makeAST(styles);
      expect(ast.rules.length).toEqual(1);

      var rule = <CssSelectorRuleAST>ast.rules[0];
      expect(rule.selectors.length).toBe(7);

      assertTokens(rule.selectors[0].tokens, ['.', 'class']);
      assertTokens(rule.selectors[1].tokens, ['#', 'id']);
      assertTokens(rule.selectors[2].tokens, ['tag']);
      assertTokens(rule.selectors[3].tokens, ['[', 'attr', ']']);
      assertTokens(rule.selectors[4].tokens, ['key', ' ', '+', ' ', 'value']);
      assertTokens(rule.selectors[5].tokens, ['*', ' ', 'value']);
      assertTokens(rule.selectors[6].tokens, [':', '-moz-any-link']);

      var style1 = <CssDefinitionAST>rule.block.entries[0];
      expect(style1.property.strValue).toEqual('prop');
      assertTokens(style1.value.tokens, ['value123']);
    });

    it('should parse keyframe rules', () => {
      var styles = `
        @keyframes rotateMe {
          from {
            transform: rotate(-360deg);
          }
          50% {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `;

      var ast = makeAST(styles);
      expect(ast.rules.length).toEqual(1);

      var rule = <CssKeyframeRuleAST>ast.rules[0];
      expect(rule.name.strValue).toEqual('rotateMe');

      var block = <CssBlockAST>rule.block;
      var fromRule = <CssKeyframeDefinitionAST>block.entries[0];

      expect(fromRule.name.strValue).toEqual('from');
      var fromStyle = <CssDefinitionAST>(<CssBlockAST>fromRule.block).entries[0];
      expect(fromStyle.property.strValue).toEqual('transform');
      assertTokens(fromStyle.value.tokens, ['rotate', '(', '-360', 'deg', ')']);

      var midRule = <CssKeyframeDefinitionAST>block.entries[1];

      expect(midRule.name.strValue).toEqual('50%');
      var midStyle = <CssDefinitionAST>(<CssBlockAST>midRule.block).entries[0];
      expect(midStyle.property.strValue).toEqual('transform');
      assertTokens(midStyle.value.tokens, ['rotate', '(', '0', 'deg', ')']);

      var toRule = <CssKeyframeDefinitionAST>block.entries[2];

      expect(toRule.name.strValue).toEqual('to');
      var toStyle = <CssDefinitionAST>(<CssBlockAST>toRule.block).entries[0];
      expect(toStyle.property.strValue).toEqual('transform');
      assertTokens(toStyle.value.tokens, ['rotate', '(', '360', 'deg', ')']);
    });

    it('should parse media queries into a stylesheet AST', () => {
      var styles = `
        @media all and (max-width:100px) {
          .selector {
            prop: value123;
          }
        }
      `;

      var ast = makeAST(styles);
      expect(ast.rules.length).toEqual(1);

      var rule = <CssMediaQueryRuleAST>ast.rules[0];
      assertTokens(rule.query, ['all', 'and', '(', 'max-width', ':', '100', 'px', ')']);

      var block = <CssBlockAST>rule.block;
      expect(block.entries.length).toEqual(1);

      var rule2 = <CssSelectorRuleAST>block.entries[0];
      expect(rule2.selectors[0].strValue).toEqual('.selector');

      var block2 = <CssBlockAST>rule2.block;
      expect(block2.entries.length).toEqual(1);
    });

    it('should parse inline CSS values', () => {
      var styles = `
        @import url('remote.css');
        @charset "UTF-8";
        @namespace ng url(http://angular.io/namespace/ng);
      `;

      var ast = makeAST(styles);

      var importRule = <CssInlineRuleAST>ast.rules[0];
      expect(importRule.type).toEqual(BlockType.Import);
      assertTokens(importRule.value.tokens, ['url', '(', 'remote', '.', 'css', ')']);

      var charsetRule = <CssInlineRuleAST>ast.rules[1];
      expect(charsetRule.type).toEqual(BlockType.Charset);
      assertTokens(charsetRule.value.tokens, ['UTF-8']);

      var namespaceRule = <CssInlineRuleAST>ast.rules[2];
      expect(namespaceRule.type).toEqual(BlockType.Namespace);
      assertTokens(
          namespaceRule.value.tokens, ['ng', 'url', '(', 'http://angular.io/namespace/ng', ')']);
    });

    it('should parse CSS values that contain functions and leave the inner function data untokenized',
       () => {
         var styles = `
        .class {
          background: url(matias.css);
          animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
          height: calc(100% - 50px);
          background-image: linear-gradient( 45deg, rgba(100, 0, 0, 0.5), black );
        }
      `;

         var ast = makeAST(styles);
         expect(ast.rules.length).toEqual(1);

         var defs = (<CssSelectorRuleAST>ast.rules[0]).block.entries;
         expect(defs.length).toEqual(4);

         assertTokens((<CssDefinitionAST>defs[0]).value.tokens, ['url', '(', 'matias.css', ')']);
         assertTokens(
             (<CssDefinitionAST>defs[1]).value.tokens,
             ['cubic-bezier', '(', '0.755, 0.050, 0.855, 0.060', ')']);
         assertTokens((<CssDefinitionAST>defs[2]).value.tokens, ['calc', '(', '100% - 50px', ')']);
         assertTokens(
             (<CssDefinitionAST>defs[3]).value.tokens,
             ['linear-gradient', '(', '45deg, rgba(100, 0, 0, 0.5), black', ')']);
       });

    it('should parse un-named block-level CSS values', () => {
      var styles = `
        @font-face {
          font-family: "Matias";
          font-weight: bold;
          src: url(font-face.ttf);
        }
        @viewport {
          max-width: 100px;
          min-height: 1000px;
        }
      `;

      var ast = makeAST(styles);

      var fontFaceRule = <CssBlockRuleAST>ast.rules[0];
      expect(fontFaceRule.type).toEqual(BlockType.FontFace);
      expect(fontFaceRule.block.entries.length).toEqual(3);

      var viewportRule = <CssBlockRuleAST>ast.rules[1];
      expect(viewportRule.type).toEqual(BlockType.Viewport);
      expect(viewportRule.block.entries.length).toEqual(2);
    });

    it('should parse multiple levels of semicolons', () => {
      var styles = `
        ;;;
        @import url('something something')
        ;;;;;;;;
        ;;;;;;;;
        ;@font-face {
          ;src   :   url(font-face.ttf);;;;;;;;
          ;;;-webkit-animation:my-animation
        };;;
        @media all and (max-width:100px)
        {;
          .selector {prop: value123;};
          ;.selector2{prop:1}}
      `;

      var ast = makeAST(styles);

      var importRule = <CssInlineRuleAST>ast.rules[0];
      expect(importRule.type).toEqual(BlockType.Import);
      assertTokens(importRule.value.tokens, ['url', '(', 'something something', ')']);

      var fontFaceRule = <CssBlockRuleAST>ast.rules[1];
      expect(fontFaceRule.type).toEqual(BlockType.FontFace);
      expect(fontFaceRule.block.entries.length).toEqual(2);

      var mediaQueryRule = <CssMediaQueryRuleAST>ast.rules[2];
      assertTokens(mediaQueryRule.query, ['all', 'and', '(', 'max-width', ':', '100', 'px', ')']);
      expect(mediaQueryRule.block.entries.length).toEqual(2);
    });

    it('should throw an error if an unknown @value block rule is parsed', () => {
      var styles = `
        @matias { hello: there; }
      `;

      expect(() => {
        makeAST(styles);
      }).toThrowError(/^CSS Parse Error: The CSS "at" rule "@matias" is not allowed to used here/g);
    });

    it('should parse empty rules', () => {
      var styles = `
        .empty-rule { }
        .somewhat-empty-rule { /* property: value; */ }
        .non-empty-rule { property: value; }
      `;

      var ast = makeAST(styles);

      var rules = ast.rules;
      expect((<CssSelectorRuleAST>rules[0]).block.entries.length).toEqual(0);
      expect((<CssSelectorRuleAST>rules[1]).block.entries.length).toEqual(0);
      expect((<CssSelectorRuleAST>rules[2]).block.entries.length).toEqual(1);
    });

    it('should parse the @document rule', () => {
      var styles = `
        @document url(http://www.w3.org/),
                       url-prefix(http://www.w3.org/Style/),
                       domain(mozilla.org),
                       regexp("https:.*")
        {
          /* CSS rules here apply to:
             - The page "http://www.w3.org/".
             - Any page whose URL begins with "http://www.w3.org/Style/"
             - Any page whose URL's host is "mozilla.org" or ends with
               ".mozilla.org"
             - Any page whose URL starts with "https:" */

          /* make the above-mentioned pages really ugly */
          body {
            color: purple;
            background: yellow;
          }
        }
      `;

      var ast = makeAST(styles);

      var rules = ast.rules;
      var documentRule = <CssBlockDefinitionRuleAST>rules[0];
      expect(documentRule.type).toEqual(BlockType.Document);

      var rule = <CssSelectorRuleAST>documentRule.block.entries[0];
      expect(rule.strValue).toEqual('body');
    });

    it('should parse the @page rule', () => {
      var styles = `
        @page one {
          .selector { prop: value; }
        }
        @page two {
          .selector2 { prop: value2; }
        }
      `;

      var ast = makeAST(styles);

      var rules = ast.rules;

      var pageRule1 = <CssBlockDefinitionRuleAST>rules[0];
      expect(pageRule1.strValue).toEqual('one');
      expect(pageRule1.type).toEqual(BlockType.Page);

      var pageRule2 = <CssBlockDefinitionRuleAST>rules[1];
      expect(pageRule2.strValue).toEqual('two');
      expect(pageRule2.type).toEqual(BlockType.Page);

      var selectorOne = <CssSelectorRuleAST>pageRule1.block.entries[0];
      expect(selectorOne.strValue).toEqual('.selector');

      var selectorTwo = <CssSelectorRuleAST>pageRule2.block.entries[0];
      expect(selectorTwo.strValue).toEqual('.selector2');
    });

    it('should parse the @supports rule', () => {
      var styles = `
        @supports (animation-name: "rotate") {
          a:hover { animation: rotate 1s; }
        }
      `;

      var ast = makeAST(styles);

      var rules = ast.rules;

      var supportsRule = <CssBlockDefinitionRuleAST>rules[0];
      assertTokens(supportsRule.query, ['(', 'animation-name', ':', 'rotate', ')']);
      expect(supportsRule.type).toEqual(BlockType.Supports);

      var selectorOne = <CssSelectorRuleAST>supportsRule.block.entries[0];
      expect(selectorOne.strValue).toEqual('a:hover');
    });

    it('should collect multiple errors during parsing', () => {
      var styles = `
        .class$value { something: something }
        @custom { something: something }
        #id { cool^: value }
      `;

      var output = parse(styles);
      expect(output.errors.length).toEqual(3);
    });

    it('should recover from selector errors and continue parsing', () => {
      var styles = `
        tag& { key: value; }
        .%tag { key: value; }
        #tag$ { key: value; }
      `;

      var output = parse(styles);
      var errors = output.errors;
      var ast = output.ast;

      expect(errors.length).toEqual(3);

      expect(ast.rules.length).toEqual(3);

      var rule1 = <CssSelectorRuleAST>ast.rules[0];
      expect(rule1.selectors[0].strValue).toEqual('tag&');
      expect(rule1.block.entries.length).toEqual(1);

      var rule2 = <CssSelectorRuleAST>ast.rules[1];
      expect(rule2.selectors[0].strValue).toEqual('.%tag');
      expect(rule2.block.entries.length).toEqual(1);

      var rule3 = <CssSelectorRuleAST>ast.rules[2];
      expect(rule3.selectors[0].strValue).toEqual('#tag$');
      expect(rule3.block.entries.length).toEqual(1);
    });

    it('should throw an error when parsing invalid CSS Selectors', () => {
      var styles = '.class[[prop%=value}] { style: val; }';
      var output = parse(styles);
      var errors = output.errors;

      expect(errors.length).toEqual(3);

      expect(errors[0].msg).toMatchPattern(/Unexpected character \[\[\] at column 0:7/g);

      expect(errors[1].msg).toMatchPattern(/Unexpected character \[%\] at column 0:12/g);

      expect(errors[2].msg).toMatchPattern(/Unexpected character \[}\] at column 0:19/g);
    });

    it('should throw an error if an attribute selector is not closed properly', () => {
      var styles = '.class[prop=value { style: val; }';
      var output = parse(styles);
      var errors = output.errors;

      expect(errors[0].msg).toMatchPattern(/Unbalanced CSS attribute selector at column 0:12/g);
    });

    it('should throw an error if a pseudo function selector is not closed properly', () => {
      var styles = 'body:lang(en { key:value; }';
      var output = parse(styles);
      var errors = output.errors;

      expect(errors[0].msg)
          .toMatchPattern(/Unbalanced pseudo selector function value at column 0:10/g);
    });

    it('should raise an error when a semi colon is missing from a CSS style/pair that isn\'t the last entry',
       () => {
         var styles = `.class {
        color: red
        background: blue
      }`;

         var output = parse(styles);
         var errors = output.errors;

         expect(errors.length).toEqual(1);

         expect(errors[0].msg)
             .toMatchPattern(
                 /The CSS key\/value definition did not end with a semicolon at column 1:15/g);
       });

    it('should parse the inner value of a :not() pseudo-selector as a CSS selector', () => {
      var styles = `div:not(.ignore-this-div) {
        prop: value;
      }`;

      var output = parse(styles);
      var errors = output.errors;
      var ast = output.ast;

      expect(errors.length).toEqual(0);

      var rule1 = <CssSelectorRuleAST>ast.rules[0];
      expect(rule1.selectors.length).toEqual(1);

      var selector = rule1.selectors[0];
      assertTokens(selector.tokens, ['div', ':', 'not', '(', '.', 'ignore-this-div', ')']);
    });

    it('should raise parse errors when CSS key/value pairs are invalid', () => {
      var styles = `.class {
        background color: value;
        color: value
        font-size;
        font-weight
      }`;

      var output = parse(styles);
      var errors = output.errors;

      expect(errors.length).toEqual(4);

      expect(errors[0].msg)
          .toMatchPattern(
              /Identifier does not match expected Character value \("color" should match ":"\) at column 1:19/g);

      expect(errors[1].msg)
          .toMatchPattern(
              /The CSS key\/value definition did not end with a semicolon at column 2:15/g);

      expect(errors[2].msg)
          .toMatchPattern(/The CSS property was not paired with a style value at column 3:8/g);

      expect(errors[3].msg)
          .toMatchPattern(/The CSS property was not paired with a style value at column 4:8/g);
    });

    it('should recover from CSS key/value parse errors', () => {
      var styles = `
        .problem-class { background color: red; color: white; }
        .good-boy-class { background-color: red; color: white; }
       `;

      var output = parse(styles);
      var ast = output.ast;

      expect(ast.rules.length).toEqual(2);

      var rule1 = <CssSelectorRuleAST>ast.rules[0];
      expect(rule1.block.entries.length).toEqual(2);

      var style1 = <CssDefinitionAST>rule1.block.entries[0];
      expect(style1.property.strValue).toEqual('background color');
      assertTokens(style1.value.tokens, ['red']);

      var style2 = <CssDefinitionAST>rule1.block.entries[1];
      expect(style2.property.strValue).toEqual('color');
      assertTokens(style2.value.tokens, ['white']);
    });

    it('should parse minified CSS content properly', () => {
      // this code was taken from the angular.io webpage's CSS code
      var styles = `
.is-hidden{display:none!important}
.is-visible{display:block!important}
.is-visually-hidden{height:1px;width:1px;overflow:hidden;opacity:0.01;position:absolute;bottom:0;right:0;z-index:1}
.grid-fluid,.grid-fixed{margin:0 auto}
.grid-fluid .c1,.grid-fixed .c1,.grid-fluid .c2,.grid-fixed .c2,.grid-fluid .c3,.grid-fixed .c3,.grid-fluid .c4,.grid-fixed .c4,.grid-fluid .c5,.grid-fixed .c5,.grid-fluid .c6,.grid-fixed .c6,.grid-fluid .c7,.grid-fixed .c7,.grid-fluid .c8,.grid-fixed .c8,.grid-fluid .c9,.grid-fixed .c9,.grid-fluid .c10,.grid-fixed .c10,.grid-fluid .c11,.grid-fixed .c11,.grid-fluid .c12,.grid-fixed .c12{display:inline;float:left}
.grid-fluid .c1.grid-right,.grid-fixed .c1.grid-right,.grid-fluid .c2.grid-right,.grid-fixed .c2.grid-right,.grid-fluid .c3.grid-right,.grid-fixed .c3.grid-right,.grid-fluid .c4.grid-right,.grid-fixed .c4.grid-right,.grid-fluid .c5.grid-right,.grid-fixed .c5.grid-right,.grid-fluid .c6.grid-right,.grid-fixed .c6.grid-right,.grid-fluid .c7.grid-right,.grid-fixed .c7.grid-right,.grid-fluid .c8.grid-right,.grid-fixed .c8.grid-right,.grid-fluid .c9.grid-right,.grid-fixed .c9.grid-right,.grid-fluid .c10.grid-right,.grid-fixed .c10.grid-right,.grid-fluid .c11.grid-right,.grid-fixed .c11.grid-right,.grid-fluid .c12.grid-right,.grid-fixed .c12.grid-right{float:right}
.grid-fluid .c1.nb,.grid-fixed .c1.nb,.grid-fluid .c2.nb,.grid-fixed .c2.nb,.grid-fluid .c3.nb,.grid-fixed .c3.nb,.grid-fluid .c4.nb,.grid-fixed .c4.nb,.grid-fluid .c5.nb,.grid-fixed .c5.nb,.grid-fluid .c6.nb,.grid-fixed .c6.nb,.grid-fluid .c7.nb,.grid-fixed .c7.nb,.grid-fluid .c8.nb,.grid-fixed .c8.nb,.grid-fluid .c9.nb,.grid-fixed .c9.nb,.grid-fluid .c10.nb,.grid-fixed .c10.nb,.grid-fluid .c11.nb,.grid-fixed .c11.nb,.grid-fluid .c12.nb,.grid-fixed .c12.nb{margin-left:0}
.grid-fluid .c1.na,.grid-fixed .c1.na,.grid-fluid .c2.na,.grid-fixed .c2.na,.grid-fluid .c3.na,.grid-fixed .c3.na,.grid-fluid .c4.na,.grid-fixed .c4.na,.grid-fluid .c5.na,.grid-fixed .c5.na,.grid-fluid .c6.na,.grid-fixed .c6.na,.grid-fluid .c7.na,.grid-fixed .c7.na,.grid-fluid .c8.na,.grid-fixed .c8.na,.grid-fluid .c9.na,.grid-fixed .c9.na,.grid-fluid .c10.na,.grid-fixed .c10.na,.grid-fluid .c11.na,.grid-fixed .c11.na,.grid-fluid .c12.na,.grid-fixed .c12.na{margin-right:0}
       `;

      var output = parse(styles);
      var errors = output.errors;
      expect(errors.length).toEqual(0);

      var ast = output.ast;
      expect(ast.rules.length).toEqual(8);
    });

    it('should parse a snippet of keyframe code from animate.css properly', () => {
      // this code was taken from the angular.io webpage's CSS code
      var styles = `
@charset "UTF-8";

/*!
 * animate.css -http://daneden.me/animate
 * Version - 3.5.1
 * Licensed under the MIT license - http://opensource.org/licenses/MIT
 *
 * Copyright (c) 2016 Daniel Eden
 */

.animated {
  -webkit-animation-duration: 1s;
  animation-duration: 1s;
  -webkit-animation-fill-mode: both;
  animation-fill-mode: both;
}

.animated.infinite {
  -webkit-animation-iteration-count: infinite;
  animation-iteration-count: infinite;
}

.animated.hinge {
  -webkit-animation-duration: 2s;
  animation-duration: 2s;
}

.animated.flipOutX,
.animated.flipOutY,
.animated.bounceIn,
.animated.bounceOut {
  -webkit-animation-duration: .75s;
  animation-duration: .75s;
}

@-webkit-keyframes bounce {
  from, 20%, 53%, 80%, to {
    -webkit-animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
    animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
    -webkit-transform: translate3d(0,0,0);
    transform: translate3d(0,0,0);
  }

  40%, 43% {
    -webkit-animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
    animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
    -webkit-transform: translate3d(0, -30px, 0);
    transform: translate3d(0, -30px, 0);
  }

  70% {
    -webkit-animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
    animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
    -webkit-transform: translate3d(0, -15px, 0);
    transform: translate3d(0, -15px, 0);
  }

  90% {
    -webkit-transform: translate3d(0,-4px,0);
    transform: translate3d(0,-4px,0);
  }
}
       `;

      var output = parse(styles);
      var errors = output.errors;
      expect(errors.length).toEqual(0);

      var ast = output.ast;
      expect(ast.rules.length).toEqual(6);

      var finalRule = <CssBlockRuleAST>ast.rules[ast.rules.length - 1];
      expect(finalRule.type).toEqual(BlockType.Keyframes);
      expect(finalRule.block.entries.length).toEqual(4);
    });
  });
}
