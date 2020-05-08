import { Component } from "./core/component";
import { engine } from "./core/rendering_engine";
import { qweb } from "./qweb/qweb";
import { useState } from "./hooks";
import { xml } from "./tags";

const renderToString = qweb.renderToString;
const mount = engine.mount;

export { mount, renderToString, Component, xml, useState };
