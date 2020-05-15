import { Component } from "./core/component";
import { mount } from "./core/rendering_engine";
import { qweb } from "./qweb/qweb";
import { useState } from "./hooks";
import { xml } from "./tags";

const renderToString = qweb.renderToString;

export { mount, renderToString, Component, xml, useState };
