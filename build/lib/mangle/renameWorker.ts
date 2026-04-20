import * as ts from 'typescript';
import * as workerpool from 'workerpool';
import { StaticLanguageServiceHost } from './staticLanguageServiceHost';

let service: ts.LanguageService | undefined;

function findRenameLocations(
	projectPath: string,
	fileName: string,
	position: number,
): readonly ts.RenameLocation[] {
	if (!service) {
		service = ts.createLanguageService(new StaticLanguageServiceHost(projectPath));
	}

	return service.findRenameLocations(fileName, position, false, false, {
		providePrefixAndSuffixTextForRename: true,
	}) ?? [];
}

workerpool.worker({
	findRenameLocations
});
