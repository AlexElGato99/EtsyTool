import type { NextConfig } from "next";
const config:NextConfig={poweredByHeader:false,experimental:{cpus:2},async redirects(){return [
  {source:'/pricing',destination:'/#free-access',permanent:true},
  {source:'/contact-us',destination:'/contact',permanent:true},
  {source:'/privacy-policy',destination:'/privacy',permanent:true},
  {source:'/terms-of-service',destination:'/terms',permanent:true},
  {source:'/docs',destination:'/about#application-purpose',permanent:true},
  {source:'/api',destination:'/about#application-purpose',permanent:true},
  {source:'/interview',destination:'/about',permanent:true},
  {source:'/affiliate',destination:'/contact#support',permanent:true},
  {source:'/resources/etsy-fee-calculator',destination:'/tools/etsy-fee-calculator',permanent:true},
  {source:'/resources/etsy-privacy-policy-generator',destination:'/tools/privacy-policy-builder',permanent:true},
  {source:'/resources/etsy-shop-name-generator',destination:'/tools/shop-name-generator',permanent:true},
  {source:'/best-selling-etsy-shops',destination:'/about#application-purpose',permanent:true},
  {source:'/best-selling-etsy-items',destination:'/about#application-purpose',permanent:true},
  {source:'/trending-etsy-shops',destination:'/about#application-purpose',permanent:true},
  {source:'/trending-etsy-listings',destination:'/about#application-purpose',permanent:true},
]}};
export default config;
