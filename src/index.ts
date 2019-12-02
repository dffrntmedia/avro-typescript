import {
	Type,
	Field,
	isRecordType,
	isArrayType,
	isEnumType,
	isMapType,
	RecordType,
	EnumType,
	isOptional,
	isStringReplacementType
} from "./model";
export { RecordType } from "./model";
/** Convert a primitive type from avro to TypeScript */
function convertPrimitive(avroType: string): string {
	switch (avroType) {
		case "long":
		case "int":
		case "double":
		case "float":
			return "number";
		case "bytes":
			return "Buffer";
		case "null":
			return "null | undefined";
		case "boolean":
			return "boolean";
		default:
			return null;
	}
}

/** Converts an Avro record type to a TypeScript file */
export function avroToTypeScript(recordType: RecordType): string {
	const output: string[] = [];
	convertRecord(recordType, output);
	return output.join("\n");
}

/** Convert an Avro Record type. Return the name, but add the definition to the file */
function convertRecord(recordType: RecordType, fileBuffer: string[]): string {
	let buffer = `export interface ${recordType.name} {\n`;
	for (let field of recordType.fields) {
		buffer += convertFieldDec(field, fileBuffer) + "\n";
	}
	buffer += "}\n";
	fileBuffer.push(buffer);
	return recordType.name;
}

/** Convert an Avro Enum type. Return the name, but add the definition to the file */
function convertEnum(enumType: EnumType, fileBuffer: string[]): string {
	const enumDef = `export enum ${enumType.name} { ${enumType.symbols.join(", ")} };\n`;
	fileBuffer.push(enumDef);
	return enumType.name;
}

function convertType(type: Type, buffer: string[]): string {
	// if it's just a name, then use that
	if (typeof type === "string") {
		return convertPrimitive(type) || type;
	} else if (type instanceof Array) {
		// array means a Union. Use the names and call recursively
		return type.map(t => convertType(t, buffer)).join(" | ");
	} else if (isStringReplacementType(type)) {
		// It means that some original type is represented as String.
		// E.g.: Java Instant is represented as String.
		return "string";
	} else if (isRecordType(type)) {
		//} type)) {
		// record, use the name and add to the buffer
		return convertRecord(type, buffer);
	} else if (isArrayType(type)) {
		// array, call recursively for the array element type
		return convertType(type.items, buffer) + "[]";
	} else if (isMapType(type)) {
		// Dictionary of types, string as key
		return `{ [index:string]:${convertType(type.values, buffer)} }`;
	} else if (isEnumType(type)) {
		// array, call recursively for the array element type
		return convertEnum(type, buffer);
	} else {
		console.error("Cannot work out type", type);
		return "UNKNOWN";
	}
}

function convertFieldDec(field: Field, buffer: string[]): string {
	// Union Type
	return `\t${field.name}${isOptional(field.type) ? "?" : ""}: ${convertType(field.type, buffer)};`;
}
