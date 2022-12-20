import * as t from '@babel/types';
import * as BabelCore from '@babel/core';
import template from '@babel/template';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { addNamed, isModule, addNamespace } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import transformKduJSX from './transform-kdu-jsx';
import sugarFragment from './sugar-fragment';
import type { KduJSXPluginOptions, State } from './interface';

export { KduJSXPluginOptions };

const hasJSX = (parentPath: NodePath<t.Program>) => {
  let fileHasJSX = false;
  parentPath.traverse({
    JSXElement(path) {
      // skip ts error
      fileHasJSX = true;
      path.stop();
    },
    JSXFragment(path) {
      fileHasJSX = true;
      path.stop();
    },
  });

  return fileHasJSX;
};

const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/;

export default ({ types }: typeof BabelCore) => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...transformKduJSX,
    ...sugarFragment,
    Program: {
      enter(path: NodePath<t.Program>, state: State) {
        if (hasJSX(path)) {
          const importNames = [
            'createKNode',
            'Fragment',
            'resolveComponent',
            'withDirectives',
            'kShow',
            'kModelSelect',
            'kModelText',
            'kModelCheckbox',
            'kModelRadio',
            'kModelText',
            'kModelDynamic',
            'resolveDirective',
            'mergeProps',
            'createTextKNode',
            'isKNode',
          ];
          if (isModule(path)) {
            // import { createKNode } from "kdu";
            const importMap: Record<string, t.Identifier> = {};
            importNames.forEach((name) => {
              state.set(name, () => {
                if (importMap[name]) {
                  return types.cloneNode(importMap[name]);
                }
                const identifier = addNamed(path, name, 'kdu', {
                  ensureLiveReference: true,
                });
                importMap[name] = identifier;
                return identifier;
              });
            });
            const { enableObjectSlots = true } = state.opts;
            if (enableObjectSlots) {
              state.set('@kdujs/babel-plugin-jsx/runtimeIsSlot', () => {
                if (importMap.runtimeIsSlot) {
                  return importMap.runtimeIsSlot;
                }
                const { name: isKNodeName } = state.get(
                  'isKNode',
                )() as t.Identifier;
                const isSlot = path.scope.generateUidIdentifier('isSlot');
                const ast = template.ast`
                  function ${isSlot.name}(s) {
                    return typeof s === 'function' || (Object.prototype.toString.call(s) === '[object Object]' && !${isKNodeName}(s));
                  }
                `;
                const lastImport = (path.get('body') as NodePath[])
                  .filter((p) => p.isImportDeclaration())
                  .pop();
                if (lastImport) {
                  lastImport.insertAfter(ast);
                }
                importMap.runtimeIsSlot = isSlot;
                return isSlot;
              });
            }
          } else {
            // var _kdu = require('kdu');
            let sourceName: t.Identifier;
            importNames.forEach((name) => {
              state.set(name, () => {
                if (!sourceName) {
                  sourceName = addNamespace(path, 'kdu', {
                    ensureLiveReference: true,
                  });
                }
                return t.memberExpression(sourceName, t.identifier(name));
              });
            });

            const helpers: Record<string, t.Identifier> = {};

            const { enableObjectSlots = true } = state.opts;
            if (enableObjectSlots) {
              state.set('@kdujs/babel-plugin-jsx/runtimeIsSlot', () => {
                if (helpers.runtimeIsSlot) {
                  return helpers.runtimeIsSlot;
                }
                const isSlot = path.scope.generateUidIdentifier('isSlot');
                const { object: objectName } = state.get(
                  'isKNode',
                )() as t.MemberExpression;
                const ast = template.ast`
                  function ${isSlot.name}(s) {
                    return typeof s === 'function' || (Object.prototype.toString.call(s) === '[object Object]' && !${(objectName as t.Identifier).name}.isKNode(s));
                  }
                `;

                const nodePaths = path.get('body') as NodePath[];
                const lastImport = nodePaths
                  .filter(
                    (p) => p.isVariableDeclaration()
                      && p.node.declarations.some(
                        (d) => (d.id as t.Identifier)?.name === sourceName.name,
                      ),
                  )
                  .pop();
                if (lastImport) {
                  lastImport.insertAfter(ast);
                }
                return isSlot;
              });
            }
          }

          const {
            opts: { pragma = '' },
            file,
          } = state;

          if (pragma) {
            state.set('createKNode', () => t.identifier(pragma));
          }

          if (file.ast.comments) {
            for (const comment of file.ast.comments) {
              const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);
              if (jsxMatches) {
                state.set('createKNode', () => t.identifier(jsxMatches[1]));
              }
            }
          }
        }
      },
      exit(path: NodePath<t.Program>) {
        const body = path.get('body') as NodePath[];
        const specifiersMap = new Map<string, t.ImportSpecifier>();

        body
          .filter(
            (nodePath) => t.isImportDeclaration(nodePath.node)
              && nodePath.node.source.value === 'kdu',
          )
          .forEach((nodePath) => {
            const { specifiers } = nodePath.node as t.ImportDeclaration;
            let shouldRemove = false;
            specifiers.forEach((specifier) => {
              if (
                !specifier.loc
                && t.isImportSpecifier(specifier)
                && t.isIdentifier(specifier.imported)
              ) {
                specifiersMap.set(specifier.imported.name, specifier);
                shouldRemove = true;
              }
            });
            if (shouldRemove) {
              nodePath.remove();
            }
          });

        const specifiers = [...specifiersMap.keys()].map(
          (imported) => specifiersMap.get(imported)!,
        );
        if (specifiers.length) {
          path.unshiftContainer(
            'body',
            t.importDeclaration(specifiers, t.stringLiteral('kdu')),
          );
        }
      },
    },
  },
});
