import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { VdCanvasModule } from './modules/vd-canvas/vd-canvas.module';


@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    VdCanvasModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }