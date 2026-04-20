declare module '@emmetio/css-parser' {
	import { BufferStream, Stylesheet } from 'EmmetNode';
	import { Stylesheet as FlatStylesheet } from 'EmmetFlatNode';

	function parseStylesheet(stream: BufferStream): Stylesheet;
	function parseStylesheet(stream: string): FlatStylesheet;

	export default parseStylesheet;
}

