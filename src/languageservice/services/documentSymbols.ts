/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SymbolInformation, DocumentSymbol } from 'vscode-languageserver-types';
import { YAMLSchemaService } from './yamlSchemaService';
import { JSONDocumentSymbols } from 'vscode-json-languageservice/lib/umd/services/jsonDocumentSymbols';
import { DocumentSymbolsContext } from 'vscode-json-languageservice/lib/umd/jsonLanguageTypes';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { yamlDocumentsCache } from '../parser/yaml-documents';
import { Telemetry } from '../telemetry';
import { isMap, isSeq, Node } from 'yaml';

export class YAMLDocumentSymbols {
  private jsonDocumentSymbols;

  constructor(
    schemaService: YAMLSchemaService,
    private readonly telemetry?: Telemetry
  ) {
    this.jsonDocumentSymbols = new JSONDocumentSymbols(schemaService);

    // override 'getKeyLabel' to handle complex mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.jsonDocumentSymbols.getKeyLabel = (property: any) => {
      const keyNode: Node = property.keyNode.internalNode;
      let name = '';
      if (isMap(keyNode)) {
        name = '{}';
      } else if (isSeq(keyNode)) {
        name = '[]';
      } else {
        name = keyNode.source;
      }
      return name;
    };
  }

  public findDocumentSymbols(
    document: TextDocument,
    context: DocumentSymbolsContext = { resultLimit: Number.MAX_VALUE }
  ): SymbolInformation[] {
    let results = [];
    try {
      const doc = yamlDocumentsCache.getYamlDocument(document);
      if (!doc || doc['documents'].length === 0) {
        return null;
      }

      for (const yamlDoc of doc['documents']) {
        if (yamlDoc.root) {
          results = results.concat(this.jsonDocumentSymbols.findDocumentSymbols(document, yamlDoc, context));
        }
      }
    } catch (err) {
      this.telemetry?.sendError('yaml.documentSymbols.error', err);
    }
    return results;
  }

  public findHierarchicalDocumentSymbols(
    document: TextDocument,
    context: DocumentSymbolsContext = { resultLimit: Number.MAX_VALUE }
  ): DocumentSymbol[] {
    let results = [];
    try {
      const doc = yamlDocumentsCache.getYamlDocument(document);
      if (!doc || doc['documents'].length === 0) {
        return null;
      }

      for (const yamlDoc of doc['documents']) {
        if (yamlDoc.root) {
          results = results.concat(this.jsonDocumentSymbols.findDocumentSymbols2(document, yamlDoc, context));
        }
      }
    } catch (err) {
      this.telemetry?.sendError('yaml.hierarchicalDocumentSymbols.error', err);
    }

    return results;
  }
}
