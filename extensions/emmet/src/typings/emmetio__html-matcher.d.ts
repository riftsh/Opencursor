declare module '@emmetio/html-matcher' {
	import { BufferStream, HtmlNode } from 'EmmetNode';
	import { HtmlNode as HtmlFlatNode } from 'EmmetFlatNode';

	function parse(stream: BufferStream): HtmlNode;
	function parse(stream: string): HtmlFlatNode;

	export default parse;
}

