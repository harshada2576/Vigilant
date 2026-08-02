/* tslint:disable */
/* eslint-disable */

export class MatrixBridge {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    create_direct_message(user_id_str: string): Promise<string>;
    create_room(name: string): Promise<string>;
    export_session(): string | undefined;
    find_direct_message(user_id_str: string): Promise<string | undefined>;
    get_media(media_source_json: string): Promise<Uint8Array>;
    get_or_create_direct_message(user_id_str: string): Promise<string>;
    get_room_history(room_id_str: string, limit: number): Promise<string>;
    static init(homeserver_url: string): Promise<MatrixBridge>;
    invite_user(room_id_str: string, user_id_str: string): Promise<string>;
    join_room(room_id_or_alias: string): Promise<string>;
    leave_room(room_id_str: string): Promise<string>;
    list_direct_messages(): Promise<string>;
    list_joined_rooms(): Promise<string>;
    load_more_history(room_id_str: string, limit: number): Promise<string>;
    login(username: string, password: string): Promise<string>;
    logout(): Promise<string>;
    on_message(callback: Function): void;
    on_notification(callback: Function): void;
    register(username: string, password: string): Promise<string>;
    restore_session(session_json: string): Promise<string>;
    send_file(room_id_str: string, data: Uint8Array, filename: string, mime_type: string): Promise<string>;
    send_image(room_id_str: string, data: Uint8Array, filename: string, mime_type: string): Promise<string>;
    send_message(room_id_str: string, message: string): Promise<string>;
    start_sync(): void;
    stop_sync(): void;
}

/**
 * A machine-readable representation of the authenticity for a `ShieldState`.
 */
export enum ShieldStateCode {
    /**
     * Not enough information available to check the authenticity.
     */
    AuthenticityNotGuaranteed = 0,
    /**
     * The sending device isn't yet known by the Client.
     */
    UnknownDevice = 1,
    /**
     * The sending device hasn't been verified by the sender.
     */
    UnsignedDevice = 2,
    /**
     * The sender hasn't been verified by the Client's user.
     */
    UnverifiedIdentity = 3,
    /**
     * The sender was previously verified but changed their identity.
     */
    VerificationViolation = 4,
    /**
     * The `sender` field on the event does not match the owner of the device
     * that established the Megolm session.
     */
    MismatchedSender = 5,
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly matrixbridge_get_room_history: (a: number, b: number, c: number, d: number) => any;
    readonly matrixbridge_load_more_history: (a: number, b: number, c: number, d: number) => any;
    readonly __wbg_matrixbridge_free: (a: number, b: number) => void;
    readonly matrixbridge_init: (a: number, b: number) => any;
    readonly matrixbridge_start_sync: (a: number) => [number, number];
    readonly matrixbridge_stop_sync: (a: number) => void;
    readonly matrixbridge_get_media: (a: number, b: number, c: number) => any;
    readonly matrixbridge_send_file: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly matrixbridge_send_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly matrixbridge_create_direct_message: (a: number, b: number, c: number) => any;
    readonly matrixbridge_create_room: (a: number, b: number, c: number) => any;
    readonly matrixbridge_export_session: (a: number) => [number, number, number, number];
    readonly matrixbridge_find_direct_message: (a: number, b: number, c: number) => any;
    readonly matrixbridge_get_or_create_direct_message: (a: number, b: number, c: number) => any;
    readonly matrixbridge_invite_user: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly matrixbridge_join_room: (a: number, b: number, c: number) => any;
    readonly matrixbridge_leave_room: (a: number, b: number, c: number) => any;
    readonly matrixbridge_list_direct_messages: (a: number) => any;
    readonly matrixbridge_list_joined_rooms: (a: number) => any;
    readonly matrixbridge_login: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly matrixbridge_logout: (a: number) => any;
    readonly matrixbridge_on_message: (a: number, b: any) => void;
    readonly matrixbridge_on_notification: (a: number, b: any) => void;
    readonly matrixbridge_register: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly matrixbridge_restore_session: (a: number, b: number, c: number) => any;
    readonly matrixbridge_send_message: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke___wasm_bindgen_dfe9ebb593cb7bad___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_dfe9ebb593cb7bad___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke___web_sys_15e964e7848ceb92___features__gen_IdbVersionChangeEvent__IdbVersionChangeEvent__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_dfe9ebb593cb7bad___JsValue___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke___js_sys_1a86e7ef078f4a10___Function_fn_wasm_bindgen_dfe9ebb593cb7bad___JsValue_____wasm_bindgen_dfe9ebb593cb7bad___sys__Undefined___js_sys_1a86e7ef078f4a10___Function_fn_wasm_bindgen_dfe9ebb593cb7bad___JsValue_____wasm_bindgen_dfe9ebb593cb7bad___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke___web_sys_15e964e7848ceb92___features__gen_Event__Event______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke_______true_: (a: number, b: number) => void;
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke_______true__1_: (a: number, b: number) => void;
    readonly wasm_bindgen_dfe9ebb593cb7bad___convert__closures_____invoke_______true__2_: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
