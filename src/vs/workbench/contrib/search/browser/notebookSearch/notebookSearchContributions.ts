import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { INotebookSearchService } from '../../common/notebookSearch.js';
import { NotebookSearchService } from './notebookSearchService.js';

export function registerContributions(): void {
	registerSingleton(INotebookSearchService, NotebookSearchService, InstantiationType.Delayed);
}
